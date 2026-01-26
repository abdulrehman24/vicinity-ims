<?php

namespace App\Http\Controllers;

use App\Models\Bundle;
use App\Models\BundleItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class BundleController extends Controller
{
    public function index()
    {
        return Bundle::with(['items.equipment'])->get();
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'items' => 'required|array',
            'items.*.equipment_id' => 'required|exists:equipment,id',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        return DB::transaction(function () use ($request) {
            $bundle = Bundle::create([
                'name' => $request->name,
                'description' => $request->description,
                'created_by' => Auth::id(),
            ]);

            foreach ($request->items as $item) {
                BundleItem::create([
                    'bundle_id' => $bundle->id,
                    'equipment_id' => $item['equipment_id'],
                    'quantity' => $item['quantity'],
                ]);
            }

            return $bundle->load('items.equipment');
        });
    }

    public function update(Request $request, Bundle $bundle)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'items' => 'required|array',
            'items.*.equipment_id' => 'required|exists:equipment,id',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        return DB::transaction(function () use ($request, $bundle) {
            $bundle->update([
                'name' => $request->name,
                'description' => $request->description,
            ]);

            // Sync items (delete all and recreate is easiest for now)
            $bundle->items()->delete();

            foreach ($request->items as $item) {
                BundleItem::create([
                    'bundle_id' => $bundle->id,
                    'equipment_id' => $item['equipment_id'],
                    'quantity' => $item['quantity'],
                ]);
            }

            return $bundle->load('items.equipment');
        });
    }

    public function destroy(Bundle $bundle)
    {
        $bundle->delete();
        return response()->noContent();
    }
}
