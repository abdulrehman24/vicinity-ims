<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\Equipment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BookingController extends Controller
{
    public function index()
    {
        $bookings = Booking::with(['equipment', 'user'])
            ->orderBy('created_at', 'desc')
            ->get();
            
        return response()->json([
            'data' => $bookings
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'equipmentId' => 'required|exists:equipment,id',
            'quantity' => 'required|integer|min:1',
            'shootName' => 'required|string',
            'quotationNumber' => 'nullable|string',
            'shootType' => 'nullable|string',
            'startDate' => 'required|date',
            'endDate' => 'required|date',
            'shift' => 'required|string',
        ]);

        $booking = Booking::create([
            'user_id' => auth()->id() ?? 1,
            'equipment_id' => $validated['equipmentId'],
            'quantity' => $validated['quantity'],
            'project_title' => $validated['shootName'],
            'quotation_number' => $validated['quotationNumber'],
            'shoot_type' => $validated['shootType'] ?? 'Commercial',
            'start_date' => $validated['startDate'],
            'end_date' => $validated['endDate'],
            'shift' => $validated['shift'],
            'status' => 'active'
        ]);

        // Update equipment status to checked_out
        $equipment = Equipment::find($validated['equipmentId']);
        if ($equipment) {
             $equipment->status = 'checked_out';
             $equipment->save();
        }

        return response()->json([
            'message' => 'Booking created successfully',
            'data' => $booking->load('equipment')
        ], 201);
    }
    
    public function returnItems(Request $request)
    {
        $validated = $request->validate([
            'items' => 'required|array',
            'items.*.id' => 'required|exists:equipment,id',
            'items.*.reportedProblem' => 'boolean',
            'items.*.problemNote' => 'nullable|string',
            'shootName' => 'required|string',
        ]);
        
        $returnedItems = [];
        
        DB::beginTransaction();
        try {
            foreach ($validated['items'] as $itemData) {
                // Find active booking for this equipment and shoot
                $booking = Booking::where('equipment_id', $itemData['id'])
                    ->where('project_title', $validated['shootName'])
                    ->where('status', 'active')
                    ->first();
                    
                if ($booking) {
                    $booking->update([
                        'status' => 'returned',
                        'returned_at' => now(),
                        'return_condition' => $itemData['reportedProblem'] ? 'damaged' : 'good',
                        'return_notes' => $itemData['problemNote'] ?? null
                    ]);
                    
                    // Update Equipment Status
                    $equipment = Equipment::find($itemData['id']);
                    if ($equipment) {
                        if ($itemData['reportedProblem']) {
                            $equipment->status = 'maintenance';
                            $equipment->remarks = $itemData['problemNote'];
                        } else {
                            $equipment->status = 'available';
                        }
                        $equipment->save();
                    }
                    
                    $returnedItems[] = $booking;
                }
            }
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Return error: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to process returns'], 500);
        }

        return response()->json([
            'message' => 'Items returned successfully',
            'data' => $returnedItems
        ]);
    }
}
