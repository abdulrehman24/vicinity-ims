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
        $bookings = Booking::with(['equipments', 'user'])
            ->orderBy('created_at', 'desc')
            ->get();
            
        return response()->json([
            'data' => $bookings
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'shootName' => 'required|string',
            'quotationNumber' => 'nullable|string',
            'shootType' => 'nullable|string',
            'startDate' => 'required|date',
            'endDate' => 'required|date',
            'shift' => 'required|string',
            'collaborators' => 'nullable|array',
            'collaborators.*' => 'string|email',
            'items' => 'required|array|min:1',
            'items.*.equipmentId' => 'required|exists:equipment,id',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        $booking = Booking::create([
            'user_id' => auth()->id() ?? 1,
            'project_title' => $validated['shootName'],
            'quotation_number' => $validated['quotationNumber'],
            'shoot_type' => $validated['shootType'] ?? 'Commercial',
            'start_date' => $validated['startDate'],
            'end_date' => $validated['endDate'],
            'shift' => $validated['shift'],
            'collaborators' => $validated['collaborators'] ?? [],
            'status' => 'active'
        ]);

        foreach ($validated['items'] as $item) {
            DB::table('booking_equipment')->insert([
                'booking_id' => $booking->id,
                'equipment_id' => $item['equipmentId'],
                'quantity' => $item['quantity'],
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $equipment = Equipment::find($item['equipmentId']);
            if ($equipment) {
                $equipment->status = 'checked_out';
                $equipment->save();
            }
        }

        return response()->json([
            'message' => 'Booking created successfully',
            'data' => $booking->load('equipments')
        ], 201);
    }
    
    public function returnItems(Request $request)
    {
        $validated = $request->validate([
            'items' => 'required|array',
            'items.*.bookingEquipmentId' => 'required|exists:booking_equipment,id',
            'items.*.reportedProblem' => 'boolean',
            'items.*.problemNote' => 'nullable|string',
            'shootName' => 'required|string',
        ]);
        
        $affectedBookings = [];
        
        DB::beginTransaction();
        try {
            foreach ($validated['items'] as $itemData) {
                $pivot = DB::table('booking_equipment')->where('id', $itemData['bookingEquipmentId'])->first();

                if ($pivot) {
                    DB::table('booking_equipment')->where('id', $pivot->id)->update([
                        'status' => 'returned',
                        'returned_at' => now(),
                        'return_condition' => $itemData['reportedProblem'] ? 'damaged' : 'good',
                        'return_notes' => $itemData['problemNote'] ?? null,
                        'updated_at' => now(),
                    ]);

                    $equipment = Equipment::find($pivot->equipment_id);
                    if ($equipment) {
                        if ($itemData['reportedProblem']) {
                            $equipment->status = 'maintenance';
                            $equipment->remarks = $itemData['problemNote'];
                        } else {
                            $equipment->status = 'available';
                        }
                        $equipment->save();
                    }

                    $affectedBookings[$pivot->booking_id] = true;
                }
            }

            foreach (array_keys($affectedBookings) as $bookingId) {
                $remaining = DB::table('booking_equipment')
                    ->where('booking_id', $bookingId)
                    ->where('status', 'active')
                    ->count();

                if ($remaining === 0) {
                    Booking::where('id', $bookingId)->update([
                        'status' => 'returned',
                        'returned_at' => now(),
                    ]);
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
            'data' => array_keys($affectedBookings)
        ]);
    }
}
