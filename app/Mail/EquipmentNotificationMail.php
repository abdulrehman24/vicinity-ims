<?php

namespace App\Mail;

use App\Models\Equipment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class EquipmentNotificationMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public Equipment $equipment;
    public string $action; // 'created' or 'decommissioned'

    public function __construct(Equipment $equipment, string $action)
    {
        $this->equipment = $equipment;
        $this->action = $action;
    }

    public function envelope(): Envelope
    {
        $subject = match ($this->action) {
            'created' => 'New Equipment Added: ' . $this->equipment->name,
            'decommissioned' => 'Equipment Decommissioned: ' . $this->equipment->name,
            default => 'Equipment Update: ' . $this->equipment->name,
        };

        return new Envelope(
            subject: $subject,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.equipment.notification',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
