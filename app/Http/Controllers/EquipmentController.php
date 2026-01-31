<?php

namespace App\Http\Controllers;

use App\Http\Resources\EquipmentResource;
use App\Models\Equipment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;

use Illuminate\Support\Facades\Log;

class EquipmentController extends Controller
{
    public function index()
    {
        return EquipmentResource::collection(Equipment::all());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string',
            'category' => 'required|string',
            'equipmentType' => 'nullable|string',
            'serialNumber' => 'nullable|string',
            'status' => 'required|string',
            'businessUnit' => 'required|string',
            'condition' => 'required|string',
            'location' => 'nullable|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:10240', // 10MB Max
            'purchaseDate' => 'nullable|date',
            'remarks' => 'nullable|string',
            'totalQuantity' => 'nullable|integer|min:1',
        ]);

        $equipmentData = $this->mapFrontendToBackend($data);

        if ($request->hasFile('image')) {
            $path = $this->processAndSaveImage($request->file('image'));
            if ($path) {
                $equipmentData['image_path'] = $path;
            }
        }

        $equipment = Equipment::create($equipmentData);

        return new EquipmentResource($equipment);
    }

    public function update(Request $request, $id)
    {
        $equipment = Equipment::findOrFail($id);

        $data = $request->validate([
            'name' => 'sometimes|string',
            'category' => 'sometimes|string',
            'equipmentType' => 'nullable|string',
            'serialNumber' => 'nullable|string',
            'status' => 'sometimes|string',
            'businessUnit' => 'sometimes|string',
            'condition' => 'sometimes|string',
            'location' => 'nullable|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:10240',
            'purchaseDate' => 'nullable|date',
            'remarks' => 'nullable|string',
            'decommissionDate' => 'nullable|date',
            'decommissionReason' => 'nullable|string',
            'repairStartDate' => 'nullable|date',
            'totalQuantity' => 'nullable|integer|min:1',
        ]);

        $equipmentData = $this->mapFrontendToBackend($data);

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

        $equipment->update($equipmentData);

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

    private function mapFrontendToBackend($data)
    {
        $mapped = [];
        if (isset($data['name'])) {
            $mapped['name'] = $data['name'];
        }
        if (isset($data['category'])) {
            $mapped['category'] = $data['category'];
        }
        if (isset($data['equipmentType'])) {
            $mapped['equipment_type'] = $data['equipmentType'];
        }
        if (isset($data['serialNumber'])) {
            $mapped['serial_number'] = $data['serialNumber'];
        }
        if (isset($data['status'])) {
            $mapped['status'] = $data['status'];
        }
        if (isset($data['businessUnit'])) {
            $mapped['business_unit'] = $data['businessUnit'];
        }
        if (isset($data['condition'])) {
            $mapped['condition'] = $data['condition'];
        }
        if (isset($data['location'])) {
            $mapped['location'] = $data['location'];
        }
        if (isset($data['purchaseDate'])) {
            $mapped['purchase_date'] = $data['purchaseDate'];
        }
        if (isset($data['remarks'])) {
            $mapped['remarks'] = $data['remarks'];
        }
        if (isset($data['decommissionDate'])) {
            $mapped['decommission_date'] = $data['decommissionDate'];
        }
        if (isset($data['decommissionReason'])) {
            $mapped['decommission_reason'] = $data['decommissionReason'];
        }
        if (isset($data['repairStartDate'])) {
            $mapped['repair_start_date'] = $data['repairStartDate'];
        }
        if (isset($data['totalQuantity'])) {
            $mapped['total_quantity'] = $data['totalQuantity'];
        }

        return $mapped;
    }

    private function processAndSaveImage($file)
    {
        $startTime = microtime(true);
        Log::info('Image processing started for file: ' . $file->getClientOriginalName());

        $manager = new ImageManager(new Driver());
        $image = $manager->read($file);

        Log::info('Image read completed in ' . round(microtime(true) - $startTime, 4) . 's');

        // Resize to max 1200px width, maintaining aspect ratio, preventing upsizing
        $image->scaleDown(width: 1200);

        Log::info('Image scaling completed in ' . round(microtime(true) - $startTime, 4) . 's');

        // Encode to JPEG with 75% quality for better performance on limited resources
        $encoded = $image->toJpeg(quality: 75);

        Log::info('Image encoding completed in ' . round(microtime(true) - $startTime, 4) . 's');

        // Generate filename
        $filename = 'equipment/' . Str::random(40) . '.jpg';

        // Save to public disk
        Storage::disk('public')->put($filename, (string) $encoded);

        Log::info('Image saved to disk in ' . round(microtime(true) - $startTime, 4) . 's');

        return '/storage/' . $filename;
    }
}
