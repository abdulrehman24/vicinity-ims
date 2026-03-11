<?php

namespace App\Mail;

use App\Models\Booking;
use App\Models\Category;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CollaborationInviteMail extends Mailable
{
    use Queueable, SerializesModels;

    public $booking;

    public $password;

    public $email;

    /**
     * Create a new message instance.
     */
    public function __construct(Booking $booking, string $email, string $password)
    {
        $this->booking = $booking;
        $this->booking->loadMissing(['user', 'equipments']);
        $this->email = $email;
        $this->password = $password;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'You have been invited to collaborate on '.$this->booking->project_title,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        // Get all categories sorted by sort_order
        $categories = Category::orderBy('sort_order')->pluck('name')->toArray();
        $categoryOrder = array_flip($categories);

        // Group equipment by category and sort categories based on sort_order
        $groupedEquipment = $this->booking->equipments
            ->sortBy('name')
            ->groupBy('category')
            ->sortKeysUsing(function ($a, $b) use ($categoryOrder) {
                $orderA = $categoryOrder[$a] ?? 999;
                $orderB = $categoryOrder[$b] ?? 999;
                
                if ($orderA === $orderB) {
                    return strcmp($a, $b);
                }
                
                return $orderA <=> $orderB;
            });

        return new Content(
            view: 'emails.collaboration_invite',
            with: [
                'booking' => $this->booking,
                'email' => $this->email,
                'password' => $this->password,
                'owner' => $this->booking->user,
                'groupedEquipment' => $groupedEquipment,
            ],
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
