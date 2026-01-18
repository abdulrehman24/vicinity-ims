<?php

namespace App\Http\Controllers;

use App\Mail\SupportTicketMail;
use App\Models\Equipment;
use App\Models\SupportTicket;
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
        ]);

        try {
            $to = config('mail.support_address') ?? config('mail.from.address');
            if ($to) {
                Mail::to($to)->queue(new SupportTicketMail($ticket->load('equipment')));
            }
        } catch (\Throwable $e) {
            Log::error('Support ticket email failed: '.$e->getMessage());
        }

        return response()->json([
            'message' => 'Support ticket created',
            'data' => $ticket,
        ], 201);
    }

    public function updateStatus(Request $request, SupportTicket $ticket)
    {
        $validated = $request->validate([
            'status' => 'required|string|in:open,in_progress,resolved',
        ]);

        $ticket->status = $validated['status'];
        $ticket->save();

        return response()->json($ticket->load('equipment'));
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
