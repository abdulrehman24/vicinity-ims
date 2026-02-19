<?php

namespace App\Http\Controllers;

use App\Mail\SupportTicketMail;
use App\Models\EquipmentLog;
use App\Models\SupportTicket;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SupportTicketController extends Controller
{
    public function index(Request $request)
    {
        $query = SupportTicket::with('equipment')->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        $tickets = $query->paginate($request->input('length', 20));

        return response()->json($tickets);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'equipmentId' => 'required|exists:equipment,id',
            'issueType' => 'required|string',
            'severity' => 'required|string',
            'description' => 'required|string',
            'reportedBy' => 'required|string',
            'quantity' => 'nullable|integer|min:1',
        ]);

        $ticketCode = $this->generateTicketCode();

        $ticket = SupportTicket::create([
            'ticket_code' => $ticketCode,
            'equipment_id' => $validated['equipmentId'],
            'issue_type' => $validated['issueType'],
            'severity' => $validated['severity'],
            'description' => $validated['description'],
            'reported_by' => $validated['reportedBy'],
            'status' => 'open',
            'quantity' => $validated['quantity'] ?? null,
        ]);

        $this->notifyUsers($ticket->load('equipment'), 'New Support Ticket: '.$ticket->ticket_code);

        // Log the incident
        EquipmentLog::create([
            'equipment_id' => $validated['equipmentId'],
            'user_id' => auth()->id(),
            'user_name' => $validated['reportedBy'],
            'action' => 'maintenance_report',
            'description' => "Ticket #{$ticketCode} ({$validated['severity']}): {$validated['description']}",
        ]);

        return response()->json([
            'message' => 'Support ticket created',
            'data' => $ticket,
        ], 201);
    }

    public function updateStatus(Request $request, SupportTicket $ticket)
    {
        $validated = $request->validate([
            'status' => 'required|string|in:open,in_progress,resolved',
            'resolvedQuantity' => 'nullable|integer|min:1',
        ]);

        $oldStatus = $ticket->status;
        $ticket->status = $validated['status'];
        $ticket->save();

        if ($oldStatus !== $ticket->status) {
            $statusLabel = str_replace('_', ' ', ucfirst($ticket->status));
            $this->notifyUsers($ticket->load('equipment'), 'Support Ticket Update: '.$ticket->ticket_code.' is now '.$statusLabel);

            // Reactivate equipment if resolved
            if ($ticket->status === 'resolved' && $ticket->equipment) {
                $equipment = $ticket->equipment;
                $resolvedQty = $validated['resolvedQuantity'] ?? null;

                $originalStatus = $equipment->status;
                $maintenance = (int) ($equipment->maintenance_quantity ?? 0);
                $total = (int) ($equipment->total_quantity ?? 0);

                if ($resolvedQty !== null) {
                    $maintenance = max(0, $maintenance - $resolvedQty);
                } else {
                    $maintenance = 0;
                }

                $newStatus = $maintenance > 0 && $maintenance >= $total ? 'maintenance' : 'available';

                $equipment->update([
                    'status' => $newStatus,
                    'maintenance_quantity' => $maintenance,
                ]);

                EquipmentLog::create([
                    'equipment_id' => $equipment->id,
                    'user_id' => auth()->id(),
                    'user_name' => auth()->user() ? auth()->user()->name : 'System',
                    'action' => 'status_change',
                    'previous_status' => $originalStatus,
                    'new_status' => $newStatus,
                    'description' => "Ticket {$ticket->ticket_code} resolved",
                ]);
            }
        }

        return response()->json($ticket->load('equipment'));
    }

    protected function notifyUsers(SupportTicket $ticket, string $subject)
    {
        try {
            // Get all approved users
            $recipients = User::where('is_approved', true)->pluck('email')->toArray();

            // Add support address if configured
            $supportAddress = config('mail.support_address');
            if ($supportAddress) {
                $recipients[] = $supportAddress;
            } else {
                 $fromAddress = config('mail.from.address');
                 if ($fromAddress) $recipients[] = $fromAddress;
            }

            // Filter unique and valid emails
            $recipients = array_unique(array_filter($recipients, function ($email) {
                return filter_var($email, FILTER_VALIDATE_EMAIL);
            }));

            foreach ($recipients as $email) {
                Mail::to($email)->queue(new SupportTicketMail($ticket, $subject));
            }
        } catch (\Throwable $e) {
            Log::error('Support ticket notification failed: '.$e->getMessage());
        }
    }

    protected function generateTicketCode(): string
    {
        do {
            $left = str_pad((string) (now()->dayOfYear), 3, '0', STR_PAD_LEFT);
            $right = str_pad((string) random_int(0, 999), 3, '0', STR_PAD_LEFT);
            $code = "VIMS-{$left}-{$right}";
        } while (SupportTicket::where('ticket_code', $code)->exists());

        return $code;
    }
}
