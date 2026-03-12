<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\CollaborationInvite;
use App\Models\Equipment;
use App\Http\Resources\EquipmentResource;
use App\Mail\CollaborationInviteMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Carbon\Carbon;

class CollaborationController extends Controller
{
    public function equipment()
    {
        $equipment = Equipment::where('status', '!=', 'decommissioned')->get();
        return EquipmentResource::collection($equipment);
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

    public function validateToken($token)
    {
        $invite = CollaborationInvite::with('booking.equipments', 'booking.dates', 'booking.user')
            ->where('token', $token)
            ->first();

        if (!$invite || !$invite->isValid()) {
            return response()->json(['message' => 'Invalid or expired link'], 403);
        }

        return response()->json([
            'booking' => $invite->booking,
            'invite' => $invite,
        ]);
    }

    public function update(Request $request, $token)
    {
        $invite = CollaborationInvite::where('token', $token)->first();

        if (!$invite || !$invite->isValid()) {
            return response()->json(['message' => 'Invalid or expired link'], 403);
        }

        $booking = $invite->booking;

        $validated = $request->validate([
            'shootName' => 'required|string',
            'remarks' => 'nullable|string|max:500',
            'items' => 'required|array',
            'items.*.equipmentId' => 'required|exists:equipment,id',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        DB::transaction(function () use ($booking, $validated) {
            $booking->update([
                'project_title' => $validated['shootName'],
                'remarks' => $validated['remarks'],
            ]);

            // Sync items (simple version: delete and re-add)
            DB::table('booking_equipment')->where('booking_id', $booking->id)->delete();

            foreach ($validated['items'] as $item) {
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
    }
}
