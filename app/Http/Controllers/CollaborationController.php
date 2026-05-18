<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\CollaborationInvite;
use App\Models\Equipment;
use App\Http\Resources\EquipmentResource;
use App\Mail\CollaborationInviteMail;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class CollaborationController extends Controller
{
    public function equipment()
    {
        $equipment = Equipment::where('status', '!=', 'decommissioned')->get();
        $categories = DB::table('categories')->where('is_active', true)->orderBy('sort_order')->get(['name', 'sort_order']);
        
        return response()->json([
            'data' => EquipmentResource::collection($equipment),
            'categories' => $categories
        ]);
    }

    public function invite(Request $request, Booking $booking)
    {
        $validated = $request->validate([
            'email' => 'required|email',
        ]);

        // Secure token generation
        $token = Str::random(64);
        
        // Link expires 1 day after the shoot (end_date)
        $expiresAt = Carbon::parse($booking->end_date)->addDays(1)->endOfDay();

        $invite = CollaborationInvite::create([
            'booking_id' => $booking->id,
            'email' => $validated['email'],
            'token' => $token,
            'access_level' => 'edit',
            'expires_at' => $expiresAt,
        ]);

        // Send Email with secure link
        try {
            Mail::to($invite->email)->queue(new CollaborationInviteMail($invite));
        } catch (\Exception $e) {
            // Log error but continue
            \Log::error("Failed to send collaboration invite: " . $e->getMessage());
        }

        return response()->json([
            'message' => 'Invite sent successfully',
            'link' => url("/collaborate/{$token}"),
        ]);
    }

    public function createViewLink(Booking $booking)
    {
        CollaborationInvite::where('booking_id', $booking->id)
            ->where('access_level', 'view')
            ->where('is_active', true)
            ->update(['is_active' => false]);

        $token = Str::random(64);

        $invite = CollaborationInvite::create([
            'booking_id' => $booking->id,
            'email' => null,
            'token' => $token,
            'access_level' => 'view',
            'expires_at' => null,
            'is_active' => true,
        ]);

        return response()->json([
            'message' => 'View-only link generated successfully',
            'link' => url("/collaborate/{$invite->token}"),
            'invite' => $invite,
        ]);
    }

    public function validateToken($token)
    {
        $invite = CollaborationInvite::with(['booking.equipments', 'booking.dates', 'booking.user'])
            ->where('token', $token)
            ->first();

        if (!$invite || !$invite->isValid()) {
            return response()->json(['message' => 'Invalid or expired link'], 403);
        }

        $booking = $invite->booking;
        
        // Transform the equipments to use EquipmentResource but keep the pivot data
        $equipments = $booking->equipments->map(function ($e) {
            $resource = (new EquipmentResource($e))->toArray(request());
            $resource['pivot'] = $e->pivot;
            return $resource;
        });

        $categories = DB::table('categories')->where('is_active', true)->orderBy('sort_order')->get(['name', 'sort_order']);

        return response()->json([
            'booking' => [
                'id' => $booking->id,
                'project_title' => $booking->project_title,
                'remarks' => $booking->remarks,
                'user' => $booking->user,
                'equipments' => $equipments,
                'dates' => $booking->dates,
            ],
            'invite' => $invite,
            'categories' => $categories
        ]);
    }

    public function update(Request $request, $token)
    {
        $invite = CollaborationInvite::where('token', $token)->first();

        if (!$invite || !$invite->isValid()) {
            return response()->json(['message' => 'Invalid or expired link'], 403);
        }
        
        if ($invite->access_level !== 'edit') {
            return response()->json(['message' => 'This link is view-only and cannot be used to edit this booking.'], 403);
        }

        $booking = $invite->booking;
        $booking->loadMissing('dates');

        if (in_array($booking->status, ['returned', 'cancelled'], true)) {
            return response()->json(['message' => 'This booking is no longer active and cannot be edited.'], 422);
        }

        $validated = $request->validate([
            'shootName' => 'required|string',
            'remarks' => 'nullable|string|max:500',
            'items' => 'required|array',
            'items.*.equipmentId' => 'required|exists:equipment,id',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        try {
            DB::transaction(function () use ($booking, $validated) {
                $bookingDates = $booking->dates
                    ->pluck('date')
                    ->map(function ($date) {
                        return Carbon::parse($date)->format('Y-m-d');
                    })
                    ->unique()
                    ->sort()
                    ->values();

                if ($bookingDates->isEmpty()) {
                    throw new \Exception('Booking has no valid scheduled dates.');
                }

                $equipmentIds = collect($validated['items'])->pluck('equipmentId')->unique()->values();
                Equipment::whereIn('id', $equipmentIds)->lockForUpdate()->get();

                $booking->update([
                    'project_title' => $validated['shootName'],
                    'remarks' => $validated['remarks'],
                    'status' => 'active',
                ]);

                // Sync items (simple version: delete and re-add)
                DB::table('booking_equipment')->where('booking_id', $booking->id)->delete();

                foreach ($validated['items'] as $item) {
                    $equipment = Equipment::find($item['equipmentId']);
                    if (! $equipment) {
                        throw new \Exception('Selected equipment was not found.');
                    }

                    $effectiveTotal = max(0, (int) $equipment->total_quantity - (int) ($equipment->maintenance_quantity ?? 0) - (int) ($equipment->decommissioned_quantity ?? 0));

                    $relevantBookings = DB::table('booking_equipment')
                        ->join('bookings', 'booking_equipment.booking_id', '=', 'bookings.id')
                        ->join('booking_dates', 'bookings.id', '=', 'booking_dates.booking_id')
                        ->where('booking_equipment.equipment_id', $equipment->id)
                        ->where('booking_equipment.status', 'active')
                        ->where('bookings.status', 'active')
                        ->where('bookings.id', '!=', $booking->id)
                        ->whereIn('booking_dates.date', $bookingDates->all())
                        ->select(
                            'booking_equipment.quantity',
                            'bookings.shift',
                            'booking_dates.date'
                        )
                        ->get();

                    $maxBookedOnAnyDay = 0;
                    foreach ($bookingDates as $date) {
                        $bookedForDay = $relevantBookings->filter(function ($b) use ($date, $booking) {
                            if ((string) $b->date !== (string) $date) {
                                return false;
                            }

                            if ($booking->shift === 'Full Day' || $b->shift === 'Full Day') {
                                return true;
                            }

                            if ($booking->shift === 'AM') {
                                return $b->shift === 'AM';
                            }

                            if ($booking->shift === 'PM') {
                                return $b->shift === 'PM';
                            }

                            return false;
                        })->sum(function ($b) {
                            return (int) ($b->quantity ?? 1);
                        });

                        if ($bookedForDay > $maxBookedOnAnyDay) {
                            $maxBookedOnAnyDay = $bookedForDay;
                        }
                    }

                    $available = max(0, $effectiveTotal - $maxBookedOnAnyDay);
                    if ((int) $item['quantity'] > $available) {
                        throw new \Exception("Insufficient inventory for {$equipment->name}. Requested: {$item['quantity']}, Available: {$available}.");
                    }

                    DB::table('booking_equipment')->insert([
                        'booking_id' => $booking->id,
                        'equipment_id' => $item['equipmentId'],
                        'quantity' => $item['quantity'],
                        'status' => 'active',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            });

            return response()->json(['message' => 'Booking updated successfully']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }
}
