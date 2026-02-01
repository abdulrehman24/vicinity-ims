<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class StockTakeReminderMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public string $status;
    public int $days;
    public string $deadline;

    public function __construct(string $status, int $days, string $deadline)
    {
        $this->status = $status;
        $this->days = $days;
        $this->deadline = $deadline;
    }

    public function envelope(): Envelope
    {
        $subject = $this->status === 'overdue' 
            ? 'URGENT: Stock Take Overdue by ' . $this->days . ' Days'
            : 'Upcoming Stock Take Reminder (' . $this->days . ' Days Left)';

        return new Envelope(
            subject: $subject,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.stock_take.reminder',
        );
    }
}
