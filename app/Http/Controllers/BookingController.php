<?php

namespace App\Http\Controllers;

use App\Mail\BookingNotificationMail;
use App\Mail\CollaborationInviteMail;
use App\Models\Booking;
use App\Models\Equipment;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class BookingController extends Controller
{
    public function index()
    {
        $bookings = Booking::with(['equipments', 'user', 'dates'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'data' => $bookings,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'shootName' => 'required|string',
            'quotationNumber' => 'nullable|string',
            'shootType' => 'nullable|string',
            'remarks' => 'nullable|string|max:500',
            'dates' => 'required|array|min:1',
            'dates.*' => 'required|date',
            'shift' => 'required|string',
            'collaborators' => 'nullable|array',
            'collaborators.*' => [
                function ($attribute, $value, $fail) {
                    if (is_string($value)) {
                        if (! filter_var($value, FILTER_VALIDATE_EMAIL)) {
                            $fail('The '.$attribute.' must be a valid email address.');
                        }
                    } elseif (is_array($value)) {
                        if (! isset($value['email']) || ! filter_var($value['email'], FILTER_VALIDATE_EMAIL)) {
                            $fail('The '.$attribute.' must contain a valid email address.');
                        }
                    } else {
                        $fail('The '.$attribute.' must be a string or an object.');
                    }
                },
            ],
            'items' => 'required|array|min:1',
            'items.*.equipmentId' => 'required|exists:equipment,id',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        $dates = collect($validated['dates'])->sort()->values();
        $startDate = $dates->first();
        $endDate = $dates->last();

        $allDatesInput = $request->input('allDates');
        $allDates = is_array($allDatesInput) && count($allDatesInput) > 0
            ? collect($allDatesInput)->sort()->values()
            : $dates;

        $sendNotifications = $request->boolean('sendNotifications', true);

        $booking = Booking::create([
            'user_id' => auth()->id() ?? 1,
            'project_title' => $validated['shootName'],
            'quotation_number' => $validated['quotationNumber'],
            'shoot_type' => $validated['shootType'] ?? 'Commercial',
            'start_date' => $startDate,
            'end_date' => $endDate,
            'shift' => $validated['shift'],
            'remarks' => $validated['remarks'] ?? null,
            'collaborators' => $validated['collaborators'] ?? [],
            'status' => 'active',
        ]);

        foreach ($dates as $date) {
            $booking->dates()->create(['date' => $date]);
        }

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

        $booking->load(['equipments', 'user']);

        if (! empty($validated['collaborators'])) {
            foreach ($validated['collaborators'] as $collaborator) {
                $email = is_string($collaborator) ? $collaborator : $collaborator['email'];
                // Auto-set expiry to 7 days from now
                $expiry = now()->addDays(7);

                try {
                    $user = User::where('email', $email)->first();

                    if (! $user) {
                        // Create new user for collaborator
                        $password = Str::random(10);
                        $user = User::create([
                            'name' => 'Collaborator', // Or extract from email
                            'email' => $email,
                            'password' => Hash::make($password),
                            'is_approved' => true, // Auto-approve invited users
                            'must_change_password' => true,
                            'expires_at' => $expiry,
                        ]);

                        // Send invitation email with credentials
                        Mail::to($email)->queue(new CollaborationInviteMail($booking, $email, $password));
                    } else {
                        // Update expiry for existing users too
                        $user->update(['expires_at' => $expiry]);
                        Mail::to($email)->queue(new BookingNotificationMail($booking));
                    }

                } catch (\Throwable $e) {
                    Log::error('Booking notification/invite email failed for '.$email.': '.$e->getMessage());
                }
            }
        }

        if ($sendNotifications) {
            try {
                $notifyCreator = Setting::where('key', 'booking_notify_creator')->value('value');
                $notifyAdmins = Setting::where('key', 'booking_notify_admins')->value('value');
                $notifyEmails = Setting::where('key', 'booking_notify_emails')->value('value');

                $shouldNotifyCreator = $notifyCreator === null ? true : $notifyCreator === '1';
                $shouldNotifyAdmins = $notifyAdmins === null ? true : $notifyAdmins === '1';

                $recipients = [];

                if ($shouldNotifyCreator && auth()->user()) {
                    $recipients[] = auth()->user()->email;
                }

                if ($shouldNotifyAdmins) {
                    $adminEmails = User::where('is_admin', '>=', 1)->pluck('email')->toArray();
                    $recipients = array_merge($recipients, $adminEmails);
                }

                if ($notifyEmails) {
                    $additionalEmails = array_map('trim', explode(',', $notifyEmails));
                    $recipients = array_merge($recipients, $additionalEmails);
                }

                $operationsAddress = config('mail.operations_address');
                if ($operationsAddress) {
                    $recipients[] = $operationsAddress;
                }

                $recipients = array_unique(array_filter($recipients, function ($email) {
                    return filter_var($email, FILTER_VALIDATE_EMAIL);
                }));

                $notificationDates = $allDates->map(function ($date) {
                    return (string) $date;
                })->all();

                foreach ($recipients as $recipient) {
                    Mail::to($recipient)->queue(new BookingNotificationMail($booking, $notificationDates));
                }
            } catch (\Throwable $e) {
                Log::error('Booking notification emails failed: '.$e->getMessage());
            }
        }

        return response()->json([
            'message' => 'Booking created successfully',
            'data' => $booking->load('equipments'),
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
                            $maintenance = (int) ($equipment->maintenance_quantity ?? 0);
                            $total = (int) ($equipment->total_quantity ?? 0);
                            $maintenance += (int) ($pivot->quantity ?? 1);
                            if ($total > 0 && $maintenance > $total) {
                                $maintenance = $total;
                            }
                            $equipment->maintenance_quantity = $maintenance;
                            $equipment->remarks = $itemData['problemNote'];
                            $equipment->status = $maintenance >= $total && $total > 0 ? 'maintenance' : 'available';
                        } else {
                            if ($equipment->status === 'checked_out') {
                                $equipment->status = 'available';
                            }
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
            Log::error('Return error: '.$e->getMessage());

            return response()->json(['message' => 'Failed to process returns'], 500);
        }

        $bookingIds = array_keys($affectedBookings);

        if (! empty($bookingIds)) {
            $bookings = Booking::with(['equipments', 'user'])
                ->whereIn('id', $bookingIds)
                ->get();

            foreach ($bookings as $booking) {
                try {
                    $operationsAddress = config('mail.operations_address') ?? config('mail.from.address');
                    if ($operationsAddress) {
                        Mail::to($operationsAddress)->queue(new BookingNotificationMail($booking));
                    }
                } catch (\Throwable $e) {
                    Log::error('Return booking email failed: '.$e->getMessage());
                }
            }
        }

        return response()->json([
            'message' => 'Items returned successfully',
            'data' => $bookingIds,
        ]);
    }

    public function cancel($id)
    {
        $booking = Booking::findOrFail($id);

        if ($booking->status === 'returned' || $booking->status === 'cancelled') {
            return response()->json(['message' => 'Booking is already returned or cancelled'], 400);
        }

        DB::transaction(function () use ($booking) {
            $booking->update(['status' => 'cancelled']);

            // Release equipment
            $bookingEquipments = DB::table('booking_equipment')
                ->where('booking_id', $booking->id)
                ->where('status', 'active')
                ->get();

            foreach ($bookingEquipments as $be) {
                // Update pivot
                DB::table('booking_equipment')
                    ->where('id', $be->id)
                    ->update(['status' => 'cancelled']);

                // Update equipment status if it was checked out
                $equipment = Equipment::find($be->equipment_id);
                if ($equipment && $equipment->status === 'checked_out') {
                    $equipment->update(['status' => 'available']);
                }
            }
        });

        return response()->json(['message' => 'Booking cancelled successfully']);
    }

    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'shootName' => 'required|string',
            'quotationNumber' => 'nullable|string',
            'collaborators' => 'nullable|array',
        ]);

        $booking = Booking::findOrFail($id);
        
        $updateData = [
            'project_title' => $validated['shootName'],
            'quotation_number' => $validated['quotationNumber'],
        ];

        if ($request->has('collaborators')) {
             $updateData['collaborators'] = $validated['collaborators'];
        }

        $booking->update($updateData);

        return response()->json(['message' => 'Booking updated', 'data' => $booking]);
    }

    public function replace(Request $request)
    {
        // 1. Validate
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:bookings,id',
            'user' => 'required|string',
            'dates' => 'required|array',
            'dates.*' => 'date',
            'items' => 'required|array',
            'items.*.equipmentId' => 'exists:equipment,id',
            'items.*.quantity' => 'required|integer|min:1',
            'shootName' => 'required|string',
            'quotationNumber' => 'nullable|string',
            'shootType' => 'nullable|string',
            'shift' => 'nullable|string',
            'collaborators' => 'nullable|array',
            'remarks' => 'nullable|string|max:500',
        ]);

        // 2. Transaction
        return DB::transaction(function () use ($validated, $request) {
            $oldBookings = Booking::whereIn('id', $validated['ids'])->get();

            $authUser = auth()->user();
            if (! $authUser) {
                abort(403, 'You are not allowed to edit this booking.');
            }

            $canEdit = false;

            foreach ($oldBookings as $oldBooking) {
                if ($oldBooking->user_id && $oldBooking->user_id === $authUser->id) {
                    $canEdit = true;
                    break;
                }

                $collaborators = $oldBooking->collaborators ?? [];
                foreach ($collaborators as $collaborator) {
                    $email = is_string($collaborator) ? $collaborator : ($collaborator['email'] ?? null);
                    if ($email && strtolower($email) === strtolower($authUser->email)) {
                        $canEdit = true;
                        break 2;
                    }
                }
            }

            if (! $canEdit && $authUser->is_admin < 2) {
                abort(403, 'You are not allowed to edit this booking.');
            }

            if ($oldBookings->isEmpty()) {
                abort(404, 'No bookings found to edit.');
            }

            // Pick a canonical booking to keep (earliest start_date, fallback to first)
            $booking = $oldBookings
                ->filter(fn ($b) => $b->start_date !== null)
                ->sortBy('start_date')
                ->first() ?? $oldBookings->first();

            $dates = collect($validated['dates'])->sort()->values();
            $startDate = $dates->first();
            $endDate = $dates->last();

            $allDatesInput = $request->input('allDates');
            $allDates = is_array($allDatesInput) && count($allDatesInput) > 0
                ? collect($allDatesInput)->sort()->values()
                : $dates;

            // Update canonical booking in place
            $booking->update([
                'project_title' => $validated['shootName'],
                'quotation_number' => $validated['quotationNumber'] ?? null,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'shift' => $validated['shift'] ?? 'Full Day',
                'shoot_type' => $validated['shootType'] ?? 'Commercial',
                'collaborators' => $validated['collaborators'] ?? [],
            'remarks' => $validated['remarks'] ?? $booking->remarks,
                'status' => 'active',
            ]);

            // Reset date records on canonical booking
            $booking->dates()->delete();
            foreach ($allDates as $date) {
                $booking->dates()->create(['date' => $date]);
            }

            // Reset booking_equipment pivot rows on canonical booking
            DB::table('booking_equipment')
                ->where('booking_id', $booking->id)
                ->delete();

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

            // Remove any other old bookings for this project (no cancellation records)
            foreach ($oldBookings as $oldBooking) {
                if ($oldBooking->id === $booking->id) {
                    continue;
                }

                DB::table('booking_equipment')
                    ->where('booking_id', $oldBooking->id)
                    ->delete();

                $oldBooking->dates()->delete();
                $oldBooking->delete();
            }

            return $booking;
        });
    }

    // Extracted from store() to be reusable
    private function createBooking($validated, Request $request)
    {
        $user = User::where('name', $validated['user'])->first();
        $userId = $user ? $user->id : (auth()->id() ?? 1); // Operations fallback
        
        $bookings = [];
        
        $startDate = min($validated['dates']);
        $endDate = max($validated['dates']);

        $allDatesInput = $request->input('allDates');
        $allDates = is_array($allDatesInput) && count($allDatesInput) > 0
            ? collect($allDatesInput)->sort()->values()
            : collect($validated['dates'])->sort()->values();

        $sendNotifications = $request->boolean('sendNotifications', true);
        
        $booking = Booking::create([
            'user_id' => $userId,
            'project_title' => $validated['shootName'],
            'quotation_number' => $validated['quotationNumber'] ?? null,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'shift' => $validated['shift'] ?? 'Full Day',
            'shoot_type' => $validated['shootType'] ?? 'Commercial',
            'collaborators' => $validated['collaborators'] ?? [],
            'remarks' => $validated['remarks'] ?? null,
            'status' => 'active',
        ]);

        foreach ($validated['items'] as $item) {
             // For each item (qty), attach to booking_equipment
             // If qty > 1, we attach multiple times? Or pivot has quantity?
             // Looking at previous reads, there is a quantity field in pivot or just multiple rows?
             // "totalBooked = relevantBookings.reduce((acc, curr) => acc + (curr.quantity || 1), 0);" 
             // suggests pivot or booking has quantity.
             
             // Let's assume pivot has quantity or we create multiple rows.
             // Standard pivot: booking_equipment (booking_id, equipment_id, status)
             // If no quantity column in pivot, we insert N rows.
             
             // CORRECTION: The store() method uses 'quantity' column in pivot!
             // And it uses 'equipmentId' key in item array.
             // Let's align with store() logic exactly.
             
            DB::table('booking_equipment')->insert([
                'booking_id' => $booking->id,
                'equipment_id' => $item['equipmentId'], // 'id' from frontend replace payload, store uses 'equipmentId'
                'quantity' => $item['quantity'],     // 'qty' from frontend replace payload, store uses 'quantity'
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
        
        // Replicate collaborator logic and email logic from store()
        // ... (truncated for brevity in thought, but must be included in code)
        
        $booking->load(['equipments', 'user']);

        if (! empty($validated['collaborators'])) {
            foreach ($validated['collaborators'] as $collaborator) {
                $email = is_string($collaborator) ? $collaborator : $collaborator['email'];
                // Auto-set expiry to 7 days from now
                $expiry = now()->addDays(7);

                try {
                    $user = User::where('email', $email)->first();

                    if (! $user) {
                        // Create new user for collaborator
                        $password = Str::random(10);
                        $user = User::create([
                            'name' => 'Collaborator', // Or extract from email
                            'email' => $email,
                            'password' => Hash::make($password),
                            'is_approved' => true, // Auto-approve invited users
                            'must_change_password' => true,
                            'expires_at' => $expiry,
                        ]);

                        // Send invitation email with credentials
                        Mail::to($email)->queue(new CollaborationInviteMail($booking, $email, $password));
                    } else {
                        // Update expiry for existing users too
                        $user->update(['expires_at' => $expiry]);
                        Mail::to($email)->queue(new BookingNotificationMail($booking));
                    }

                } catch (\Throwable $e) {
                    Log::error('Booking notification/invite email failed for '.$email.': '.$e->getMessage());
                }
            }
        }

        if ($sendNotifications) {
            try {
                $notifyCreator = Setting::where('key', 'booking_notify_creator')->value('value');
                $notifyAdmins = Setting::where('key', 'booking_notify_admins')->value('value');
                $notifyEmails = Setting::where('key', 'booking_notify_emails')->value('value');

                $shouldNotifyCreator = $notifyCreator === null ? true : $notifyCreator === '1';
                $shouldNotifyAdmins = $notifyAdmins === null ? true : $notifyAdmins === '1';

                $recipients = [];

                if ($shouldNotifyCreator && auth()->user()) {
                    $recipients[] = auth()->user()->email;
                }

                if ($shouldNotifyAdmins) {
                    $adminEmails = User::where('is_admin', '>=', 1)->pluck('email')->toArray();
                    $recipients = array_merge($recipients, $adminEmails);
                }

                if ($notifyEmails) {
                    $additionalEmails = array_map('trim', explode(',', $notifyEmails));
                    $recipients = array_merge($recipients, $additionalEmails);
                }

                $operationsAddress = config('mail.operations_address');
                if ($operationsAddress) {
                    $recipients[] = $operationsAddress;
                }

                $recipients = array_unique(array_filter($recipients, function ($email) {
                    return filter_var($email, FILTER_VALIDATE_EMAIL);
                }));

                $notificationDates = $allDates->map(function ($date) {
                    return (string) $date;
                })->all();

                foreach ($recipients as $recipient) {
                    Mail::to($recipient)->queue(new BookingNotificationMail($booking, $notificationDates));
                }
            } catch (\Throwable $e) {
                Log::error('Booking notification emails failed: '.$e->getMessage());
            }
        }

        return response()->json(['message' => 'Booking updated successfully', 'booking_id' => $booking->id]);
    }
}
