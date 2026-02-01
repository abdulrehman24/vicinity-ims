<?php

namespace App\Mail;

use App\Models\SupportTicket;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SupportTicketMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public SupportTicket $ticket;
    public string $customSubject;

    public function __construct(SupportTicket $ticket, string $subject = null)
    {
        $this->ticket = $ticket;
        $this->customSubject = $subject ?? ('New Support Ticket: '.$this->ticket->ticket_code);
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->customSubject,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.support.ticket',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
