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

        $booking = Booking::create([
            'user_id' => auth()->id() ?? 1,
            'project_title' => $validated['shootName'],
            'quotation_number' => $validated['quotationNumber'],
            'shoot_type' => $validated['shootType'] ?? 'Commercial',
            'start_date' => $startDate,
            'end_date' => $endDate,
            'shift' => $validated['shift'],
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

        try {
            // Notification Logic based on Admin Settings
            $notifyCreator = Setting::where('key', 'booking_notify_creator')->value('value');
            $notifyAdmins = Setting::where('key', 'booking_notify_admins')->value('value');
            $notifyEmails = Setting::where('key', 'booking_notify_emails')->value('value');

            // Default to true if not set (User + All Admins)
            $shouldNotifyCreator = $notifyCreator === null ? true : $notifyCreator === '1';
            $shouldNotifyAdmins = $notifyAdmins === null ? true : $notifyAdmins === '1';

            $recipients = [];

            // 1. Notify Creator (User)
            if ($shouldNotifyCreator && auth()->user()) {
                $recipients[] = auth()->user()->email;
            }

            // 2. Notify All Admins
            if ($shouldNotifyAdmins) {
                $adminEmails = User::where('is_admin', '>=', 1)->pluck('email')->toArray();
                $recipients = array_merge($recipients, $adminEmails);
            }

            // 3. Notify Additional Emails
            if ($notifyEmails) {
                $additionalEmails = array_map('trim', explode(',', $notifyEmails));
                $recipients = array_merge($recipients, $additionalEmails);
            }

            // 4. Fallback/Operations Address (Legacy)
            $operationsAddress = config('mail.operations_address');
            if ($operationsAddress) {
                $recipients[] = $operationsAddress;
            }

            // Filter unique and valid emails
            $recipients = array_unique(array_filter($recipients, function ($email) {
                return filter_var($email, FILTER_VALIDATE_EMAIL);
            }));

            foreach ($recipients as $recipient) {
                Mail::to($recipient)->queue(new BookingNotificationMail($booking));
            }
        } catch (\Throwable $e) {
            Log::error('Booking notification emails failed: '.$e->getMessage());
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
}
