<?php

namespace App\Http\Controllers;

use App\Http\Resources\EquipmentResource;
use App\Models\Equipment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

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
            'image' => 'nullable', // Base64 string expected
            'purchaseDate' => 'nullable|date',
            'remarks' => 'nullable|string',
            'totalQuantity' => 'nullable|integer|min:1',
        ]);

        $equipmentData = $this->mapFrontendToBackend($data);

        if (!empty($data['image'])) {
            $path = $this->saveImage($data['image']);
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
            'image' => 'nullable',
            'purchaseDate' => 'nullable|date',
            'remarks' => 'nullable|string',
            'decommissionDate' => 'nullable|date',
            'decommissionReason' => 'nullable|string',
            'repairStartDate' => 'nullable|date',
            'totalQuantity' => 'nullable|integer|min:1',
        ]);

        $equipmentData = $this->mapFrontendToBackend($data);

        // Handle image update
        if (isset($data['image']) && $data['image'] !== $equipment->image_path) {
             // Check if it's a new base64 string
             if (str_starts_with($data['image'], 'data:image')) {
                 // Delete old image if exists
                 if ($equipment->image_path) {
                     $oldPath = str_replace('/storage/', '', $equipment->image_path);
                     if (Storage::disk('public')->exists($oldPath)) {
                         Storage::disk('public')->delete($oldPath);
                     }
                 }
                 
                 $path = $this->saveImage($data['image']);
                 if ($path) {
                     $equipmentData['image_path'] = $path;
                 }
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
        if (isset($data['name'])) $mapped['name'] = $data['name'];
        if (isset($data['category'])) $mapped['category'] = $data['category'];
        if (isset($data['equipmentType'])) $mapped['equipment_type'] = $data['equipmentType'];
        if (isset($data['serialNumber'])) $mapped['serial_number'] = $data['serialNumber'];
        if (isset($data['status'])) $mapped['status'] = $data['status'];
        if (isset($data['businessUnit'])) $mapped['business_unit'] = $data['businessUnit'];
        if (isset($data['condition'])) $mapped['condition'] = $data['condition'];
        if (isset($data['location'])) $mapped['location'] = $data['location'];
        if (isset($data['purchaseDate'])) $mapped['purchase_date'] = $data['purchaseDate'];
        if (isset($data['remarks'])) $mapped['remarks'] = $data['remarks'];
        if (isset($data['decommissionDate'])) $mapped['decommission_date'] = $data['decommissionDate'];
        if (isset($data['decommissionReason'])) $mapped['decommission_reason'] = $data['decommissionReason'];
        if (isset($data['repairStartDate'])) $mapped['repair_start_date'] = $data['repairStartDate'];
        if (isset($data['totalQuantity'])) $mapped['total_quantity'] = $data['totalQuantity'];
        
        return $mapped;
    }

    private function saveImage($base64Image)
    {
        // Check if it's a valid base64 image string
        if (!preg_match('/^data:image\/(\w+);base64,/', $base64Image, $type)) {
            return null;
        }

        $data = substr($base64Image, strpos($base64Image, ',') + 1);
        $type = strtolower($type[1]); // jpg, png, etc.

        if (!in_array($type, ['jpg', 'jpeg', 'gif', 'png', 'webp'])) {
            return null;
        }

        $data = base64_decode($data);

        if ($data === false) {
            return null;
        }

        $filename = 'equipment/' . Str::random(40) . '.' . $type;
        Storage::disk('public')->put($filename, $data);

        return '/storage/' . $filename;
    }
}
