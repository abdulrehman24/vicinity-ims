<?php

namespace App\Mail;

use App\Models\Booking;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BookingNotificationMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public Booking $booking;
    public array $dates = [];

    public function __construct(Booking $booking, ?array $dates = null)
    {
        $this->booking = $booking;

        if ($dates !== null && count($dates) > 0) {
            $this->dates = array_values(array_unique(array_map(function ($date) {
                return Carbon::parse($date)->format('Y-m-d');
            }, $dates)));
        } else {
            $this->booking->loadMissing('dates');

            if ($this->booking->relationLoaded('dates') && $this->booking->dates->count() > 0) {
                $this->dates = $this->booking->dates
                    ->pluck('date')
                    ->filter()
                    ->map(function ($date) {
                        return Carbon::parse($date)->format('Y-m-d');
                    })
                    ->unique()
                    ->values()
                    ->all();
            } elseif ($this->booking->start_date && $this->booking->end_date) {
                $start = Carbon::parse($this->booking->start_date);
                $end = Carbon::parse($this->booking->end_date);

                if ($start->lessThanOrEqualTo($end)) {
                    $current = $start->copy();
                    while ($current->lessThanOrEqualTo($end)) {
                        $this->dates[] = $current->format('Y-m-d');
                        $current->addDay();
                    }
                }
            }
        }
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'New Equipment Booking: '.$this->booking->project_title,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.booking.notification',
            with: [
                'booking' => $this->booking,
                'dates' => $this->dates,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
