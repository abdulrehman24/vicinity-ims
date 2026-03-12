<?php

namespace App\Mail;

use App\Models\CollaborationInvite;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CollaborationInviteMail extends Mailable
{
    use Queueable, SerializesModels;

    public $invite;
    public $booking;

    public function __construct(CollaborationInvite $invite)
    {
        $this->invite = $invite;
        $this->booking = $invite->booking;
        $this->booking->loadMissing(['user', 'equipments']);
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Invitation to collaborate on project: ' . $this->booking->project_title,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.collaboration_invite',
            with: [
                'invite' => $this->invite,
                'booking' => $this->booking,
                'link' => url("/collaborate/{$this->invite->token}"),
                'expires_at' => $this->invite->expires_at->format('M d, Y H:i'),
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
