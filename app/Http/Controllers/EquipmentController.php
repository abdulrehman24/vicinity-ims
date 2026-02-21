<?php

namespace App\Http\Controllers;

use App\Http\Resources\EquipmentResource;
use App\Mail\EquipmentNotificationMail;
use App\Models\Equipment;
use App\Models\EquipmentLog;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;

class EquipmentController extends Controller
{
    public function index()
    {
        return EquipmentResource::collection(Equipment::all());
    }

    public function store(Request $request)
    {
        if ($request->has('nextAuditDate') && !$request->input('nextAuditDate')) {
            $request->merge(['nextAuditDate' => null]);
        }

        $data = $request->validate([
            'name' => 'required|string',
            'category' => 'required|string',
            'equipmentType' => 'nullable|string',
            'serialNumber' => 'nullable|string|unique:equipment,serial_number',
            'status' => 'required|string',
            'businessUnit' => 'required|string',
            'condition' => 'required|string',
            'location' => 'nullable|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:10240',
            'purchaseDate' => 'nullable|date',
            'remarks' => 'nullable|string',
            'description' => 'nullable|string',
            'totalQuantity' => 'nullable|integer|min:1',
            'maintenanceQuantity' => 'nullable|integer|min:0',
            'decommissionedQuantity' => 'nullable|integer|min:0',
            'nextAuditDate' => 'nullable|date',
            'decommissionDate' => 'nullable|date',
            'decommissionReason' => 'nullable|string',
            'repairStartDate' => 'nullable|date',
        ]);

        $equipmentData = $this->mapFrontendToBackend($data);

        // Calculate next_audit_date if not provided
        if (!isset($equipmentData['next_audit_date'])) {
            $auditInterval = Setting::where('key', 'audit_interval_months')->value('value') ?? 6;
            $equipmentData['next_audit_date'] = now()->addMonths((int)$auditInterval);
        }

        if ($request->hasFile('image')) {
            $path = $this->processAndSaveImage($request->file('image'));
            if ($path) {
                $equipmentData['image_path'] = $path;
            }
        }

        $equipment = Equipment::create($equipmentData);

        $this->notifyUsers($equipment, 'created');

        return new EquipmentResource($equipment);
    }

    public function update(Request $request, $id)
    {
        $equipment = Equipment::findOrFail($id);

        if ($request->has('nextAuditDate') && !$request->input('nextAuditDate')) {
            $request->merge(['nextAuditDate' => null]);
        }

        $data = $request->validate([
            'name' => 'required|string',
            'category' => 'required|string',
            'equipmentType' => 'nullable|string',
            'serialNumber' => 'nullable|string|unique:equipment,serial_number,' . $equipment->id,
            'status' => 'required|string',
            'businessUnit' => 'required|string',
            'condition' => 'required|string',
            'location' => 'nullable|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:10240',
            'purchaseDate' => 'nullable|date',
            'remarks' => 'nullable|string',
            'description' => 'nullable|string',
            'totalQuantity' => 'nullable|integer|min:0',
            'maintenanceQuantity' => 'nullable|integer|min:0',
            'decommissionedQuantity' => 'nullable|integer|min:0',
            'nextAuditDate' => 'nullable|date',
            'decommissionDate' => 'nullable|date',
            'decommissionReason' => 'nullable|string',
            'repairStartDate' => 'nullable|date',
        ]);

        $equipmentData = $this->mapFrontendToBackend($data);

        if (!isset($equipmentData['next_audit_date'])) {
            $auditInterval = Setting::where('key', 'audit_interval_months')->value('value') ?? 6;
            $equipmentData['next_audit_date'] = now()->addMonths((int)$auditInterval);
        }

        // Handle image update via FormData
        if ($request->hasFile('image')) {
            // Delete old image if exists
            if ($equipment->image_path) {
                $oldPath = str_replace('/storage/', '', $equipment->image_path);
                if (Storage::disk('public')->exists($oldPath)) {
                    Storage::disk('public')->delete($oldPath);
                }
            }

            $path = $this->processAndSaveImage($request->file('image'));
            if ($path) {
                $equipmentData['image_path'] = $path;
            }
        }

        $originalStatus = $equipment->getOriginal('status');
        $equipment->update($equipmentData);

        if ($equipment->wasChanged('status')) {
            EquipmentLog::create([
                'equipment_id' => $equipment->id,
                'user_id' => auth()->id(),
                'user_name' => auth()->user() ? auth()->user()->name : 'System',
                'action' => 'status_change',
                'previous_status' => $originalStatus,
                'new_status' => $equipment->status,
                'description' => $equipment->remarks ?? 'Status updated',
            ]);

            if ($equipment->status === 'decommissioned') {
                $this->notifyUsers($equipment, 'decommissioned');
            }
        }

        return new EquipmentResource($equipment);
    }

    public function destroy($id)
    {
        $equipment = Equipment::findOrFail($id);

        if ($equipment->image_path) {
            $oldPath = str_replace('/storage/', '', $equipment->image_path);
            if (Storage::disk('public')->exists($oldPath)) {
                Storage::disk('public')->delete($oldPath);
            }
        }

        $equipment->delete();

        return response()->json(null, 204);
    }

    private function notifyUsers(Equipment $equipment, string $action)
    {
        try {
            // Get all approved users
            $recipients = User::where('is_approved', true)->pluck('email')->toArray();

            // Filter unique and valid emails
            $recipients = array_unique(array_filter($recipients, function ($email) {
                return filter_var($email, FILTER_VALIDATE_EMAIL);
            }));

            foreach ($recipients as $email) {
                Mail::to($email)->queue(new EquipmentNotificationMail($equipment, $action));
            }
        } catch (\Throwable $e) {
            Log::error('Equipment notification failed: '.$e->getMessage());
        }
    }

    private function mapFrontendToBackend($data)
    {
        $mapped = [];

        if (array_key_exists('name', $data)) {
            $mapped['name'] = $data['name'];
        }
        if (array_key_exists('category', $data)) {
            $mapped['category'] = $data['category'];
        }
        if (array_key_exists('equipmentType', $data)) {
            $mapped['equipment_type'] = $data['equipmentType'];
        }
        if (array_key_exists('serialNumber', $data)) {
            $mapped['serial_number'] = $data['serialNumber'];
        }
        if (array_key_exists('status', $data)) {
            $mapped['status'] = $data['status'];
        }
        if (array_key_exists('businessUnit', $data)) {
            $mapped['business_unit'] = $data['businessUnit'];
        }
        if (array_key_exists('condition', $data)) {
            $mapped['condition'] = $data['condition'];
        }
        if (array_key_exists('location', $data)) {
            $mapped['location'] = $data['location'];
        }
        if (array_key_exists('purchaseDate', $data)) {
            $mapped['purchase_date'] = $data['purchaseDate'];
        }
        if (array_key_exists('remarks', $data)) {
            $mapped['remarks'] = $data['remarks'];
        }
        if (array_key_exists('description', $data)) {
            $mapped['description'] = $data['description'];
        }
        if (array_key_exists('decommissionDate', $data)) {
            $mapped['decommission_date'] = $data['decommissionDate'];
        }
        if (array_key_exists('decommissionReason', $data)) {
            $mapped['decommission_reason'] = $data['decommissionReason'];
        }
        if (array_key_exists('repairStartDate', $data)) {
            $mapped['repair_start_date'] = $data['repairStartDate'];
        }
        if (array_key_exists('totalQuantity', $data)) {
            $mapped['total_quantity'] = $data['totalQuantity'];
        }
        if (array_key_exists('maintenanceQuantity', $data)) {
            $mapped['maintenance_quantity'] = $data['maintenanceQuantity'];
        }
        if (array_key_exists('decommissionedQuantity', $data)) {
            $mapped['decommissioned_quantity'] = $data['decommissionedQuantity'];
        }
        if (array_key_exists('nextAuditDate', $data)) {
            $mapped['next_audit_date'] = $data['nextAuditDate'];
        }

        return $mapped;
    }

    private function processAndSaveImage($file)
    {

        $manager = new ImageManager(new Driver());
        $image = $manager->read($file);

        // Resize to max 1200px width, maintaining aspect ratio, preventing upsizing
        $image->scaleDown(width: 1200);

        // Encode to JPEG with 75% quality for better performance on limited resources
        $encoded = $image->toJpeg(quality: 75);

        // Generate filename
        $filename = 'equipment/' . Str::random(40) . '.jpg';

        // Save to public disk
        Storage::disk('public')->put($filename, (string) $encoded);

        return '/storage/' . $filename;
    }
}
