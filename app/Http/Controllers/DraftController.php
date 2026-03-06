<?php

namespace App\Http\Controllers;

use App\Models\Draft;
use App\Models\DraftItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DraftController extends Controller
{
    public function index()
    {
        return Draft::where('user_id', Auth::id())
            ->with(['items.equipment'])
            ->latest()
            ->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'project_title' => 'nullable|string|max:255',
            'quotation_number' => 'nullable|string|max:255',
            'shoot_type' => 'nullable|string|max:255',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'shift' => 'nullable|string|max:255',
            'remarks' => 'nullable|string',
            'collaborators' => 'nullable|array',
            'items' => 'required|array',
            'items.*.id' => 'required|exists:equipment,id',
            'items.*.qty' => 'required|integer|min:1',
        ]);

        return DB::transaction(function () use ($validated) {
            $draft = Draft::create([
                'user_id' => Auth::id(),
                'project_title' => $validated['project_title'] ?? null,
                'quotation_number' => $validated['quotation_number'] ?? null,
                'shoot_type' => $validated['shoot_type'] ?? null,
                'start_date' => $validated['start_date'] ?? null,
                'end_date' => $validated['end_date'] ?? null,
                'shift' => $validated['shift'] ?? null,
                'remarks' => $validated['remarks'] ?? null,
                'collaborators' => $validated['collaborators'] ?? [],
            ]);

            foreach ($validated['items'] as $item) {
                DraftItem::create([
                    'draft_id' => $draft->id,
                    'equipment_id' => $item['id'],
                    'quantity' => $item['qty'],
                ]);
            }

            return $draft->load('items.equipment');
        });
    }

    public function update(Request $request, Draft $draft)
    {
        if ($draft->user_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'project_title' => 'nullable|string|max:255',
            'quotation_number' => 'nullable|string|max:255',
            'shoot_type' => 'nullable|string|max:255',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'shift' => 'nullable|string|max:255',
            'remarks' => 'nullable|string',
            'collaborators' => 'nullable|array',
            'items' => 'required|array',
            'items.*.id' => 'required|exists:equipment,id',
            'items.*.qty' => 'required|integer|min:1',
        ]);

        Log::info('Updating Draft Collaborators', [
            'draft_id' => $draft->id,
            'collaborators' => $validated['collaborators'] ?? [],
        ]);

        return DB::transaction(function () use ($validated, $draft) {
            $draft->update([
                'project_title' => $validated['project_title'] ?? null,
                'quotation_number' => $validated['quotation_number'] ?? null,
                'shoot_type' => $validated['shoot_type'] ?? null,
                'start_date' => $validated['start_date'] ?? null,
                'end_date' => $validated['end_date'] ?? null,
                'shift' => $validated['shift'] ?? null,
                'remarks' => $validated['remarks'] ?? null,
                'collaborators' => $validated['collaborators'] ?? [],
            ]);

            $draft->items()->delete();

            foreach ($validated['items'] as $item) {
                DraftItem::create([
                    'draft_id' => $draft->id,
                    'equipment_id' => $item['id'],
                    'quantity' => $item['qty'],
                ]);
            }

            return $draft->load('items.equipment');
        });
    }

    public function destroy(Draft $draft)
    {
        if ($draft->user_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $draft->delete();

        return response()->noContent();
    }
}
