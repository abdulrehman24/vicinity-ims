<?php

namespace App\Http\Controllers;

use App\Models\PersonalBundle;
use App\Models\PersonalBundleItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class PersonalBundleController extends Controller
{
    public function index()
    {
        return PersonalBundle::where('user_id', Auth::id())
            ->with(['items.equipment'])
            ->get();
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
            $bundle = PersonalBundle::create([
                'name' => $request->name,
                'description' => $request->description,
                'user_id' => Auth::id(),
            ]);

            foreach ($request->items as $item) {
                PersonalBundleItem::create([
                    'personal_bundle_id' => $bundle->id,
                    'equipment_id' => $item['equipment_id'],
                    'quantity' => $item['quantity'],
                ]);
            }

            return $bundle->load('items.equipment');
        });
    }

    public function update(Request $request, PersonalBundle $personalBundle)
    {
        if ($personalBundle->user_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'items' => 'required|array',
            'items.*.equipment_id' => 'required|exists:equipment,id',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        return DB::transaction(function () use ($request, $personalBundle) {
            $personalBundle->update([
                'name' => $request->name,
                'description' => $request->description,
            ]);

            $personalBundle->items()->delete();

            foreach ($request->items as $item) {
                PersonalBundleItem::create([
                    'personal_bundle_id' => $personalBundle->id,
                    'equipment_id' => $item['equipment_id'],
                    'quantity' => $item['quantity'],
                ]);
            }

            return $personalBundle->load('items.equipment');
        });
    }

    public function destroy(PersonalBundle $personalBundle)
    {
        if ($personalBundle->user_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $personalBundle->delete();

        return response()->noContent();
    }
}
