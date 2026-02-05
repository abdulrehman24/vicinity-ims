<?php

namespace App\Http\Controllers;

use App\Http\Resources\EquipmentResource;
use App\Models\Equipment;
use App\Models\Setting;
use App\Models\StockTake;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;

class StockTakeController extends Controller
{
    public function index()
    {
        $today = now()->startOfDay();
        $stockTakes = StockTake::with(['equipment', 'user'])
            ->where('created_at', '>=', $today)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'data' => $stockTakes
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'equipment_id' => 'required|exists:equipment,id',
            'condition' => 'required|string',
            'location' => 'nullable|string',
            'notes' => 'nullable|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:10240',
        ]);

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $this->processAndSaveImage($request->file('image'));
        }

        $stockTake = StockTake::create([
            'equipment_id' => $data['equipment_id'],
            'user_id' => auth()->id(),
            'condition' => $data['condition'],
            'location' => $data['location'],
            'notes' => $data['notes'],
            'image_path' => $imagePath,
        ]);

        // Update Equipment
        $equipment = Equipment::findOrFail($data['equipment_id']);
        
        $updates = [
            'condition' => $data['condition'],
        ];

        if (!empty($data['location'])) {
            $updates['location'] = $data['location'];
        }

        // If a new verification photo is uploaded, we update the main image as well
        // "Saving will replace the asset's main display image with the latest upload." - from StockTake.jsx
        if ($imagePath) {
            $updates['image_path'] = $imagePath;
            
            // Delete old image if exists and different
            if ($equipment->image_path && $equipment->image_path !== $imagePath) {
                 $oldPath = str_replace('/storage/', '', $equipment->image_path);
                 if (Storage::disk('public')->exists($oldPath)) {
                     Storage::disk('public')->delete($oldPath);
                 }
            }
        }

        // Calculate next audit date
        $auditInterval = Setting::where('key', 'audit_interval_months')->value('value') ?? 6;
        $updates['next_audit_date'] = now()->addMonths((int)$auditInterval);

        $equipment->update($updates);

        return response()->json([
            'message' => 'Stock take recorded successfully',
            'data' => $stockTake,
            'equipment' => new EquipmentResource($equipment)
        ], 201);
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
        $filename = 'stock_takes/' . Str::random(40) . '.jpg';

        // Save to public disk
        Storage::disk('public')->put($filename, (string) $encoded);

        return '/storage/' . $filename;
    }
}
