<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Setting;
use App\Models\User;
use App\Mail\StockTakeReminderMail;
use Illuminate\Support\Facades\Mail;
use Carbon\Carbon;

class SendStockTakeReminders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'ims:send-stock-take-reminders';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send stock take reminders based on settings';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $enabled = Setting::where('key', 'stock_take_reminder_enabled')->value('value') === '1';
        if (!$enabled) {
            $this->info('Stock take reminders are disabled.');
            return;
        }

        $nextDateStr = Setting::where('key', 'audit_next_date')->value('value');
        if (!$nextDateStr) {
            $this->info('No next audit date set.');
            return;
        }

        $nextDate = Carbon::parse($nextDateStr)->startOfDay();
        $today = Carbon::now()->startOfDay();

        $daysBefore = (int)(Setting::where('key', 'stock_take_reminder_days_before')->value('value') ?: 30);
        $daysOverdue = (int)(Setting::where('key', 'stock_take_reminder_days_overdue')->value('value') ?: 3);
        $frequency = Setting::where('key', 'stock_take_reminder_frequency')->value('value') ?: 'weekly';

        $lastSentStr = Setting::where('key', 'stock_take_last_reminder_at')->value('value');
        $lastSent = $lastSentStr ? Carbon::parse($lastSentStr)->startOfDay() : null;

        $shouldSend = false;
        $status = 'upcoming';
        $daysDiff = 0;

        // Calculate window boundaries
        $startDate = $nextDate->copy()->subDays($daysBefore);
        $overdueDate = $nextDate->copy()->addDays($daysOverdue);

        // Check if we are in a reminder window
        if ($today->gte($startDate) && $today->lt($nextDate)) {
            // Upcoming window
            $status = 'upcoming';
            $daysDiff = $today->diffInDays($nextDate); // Days remaining
        } elseif ($today->gte($overdueDate)) {
            // Overdue window
            $status = 'overdue';
            $daysDiff = $today->diffInDays($nextDate); // Days past
        } else {
            $this->info('Not in a reminder window. Today: ' . $today->toDateString() . ', Start: ' . $startDate->toDateString() . ', Overdue Start: ' . $overdueDate->toDateString());
            return;
        }

        // Check frequency
        if ($lastSent) {
            $daysSinceLast = $today->diffInDays($lastSent);
            if ($frequency === 'weekly' && $daysSinceLast < 7) {
                $this->info('Already sent this week. Last sent: ' . $lastSent->toDateString());
                return;
            }
            if ($frequency === 'daily' && $daysSinceLast < 1) {
                $this->info('Already sent today.');
                return;
            }
        }

        // Send Emails
        $this->info("Sending $status reminder (Days diff: $daysDiff)...");
        $this->sendEmails($status, $daysDiff, $nextDate->format('Y-m-d'));

        // Update last sent timestamp
        Setting::updateOrCreate(
            ['key' => 'stock_take_last_reminder_at'],
            ['value' => $today->toDateTimeString()]
        );

        $this->info('Reminders sent successfully.');
    }

    private function sendEmails($status, $days, $deadline)
    {
        // Get Admins
        $admins = User::where('is_admin', '>=', 1)->pluck('email')->toArray();
        
        // Get Additional Emails
        $extraEmailsStr = Setting::where('key', 'stock_take_notify_emails')->value('value');
        $extraEmails = $extraEmailsStr ? array_map('trim', explode(',', $extraEmailsStr)) : [];

        $recipients = array_unique(array_merge($admins, $extraEmails));
        $recipients = array_filter($recipients, fn($email) => filter_var($email, FILTER_VALIDATE_EMAIL));

        foreach ($recipients as $email) {
            try {
                Mail::to($email)->send(new StockTakeReminderMail($status, $days, $deadline));
                $this->info("Sent to: $email");
            } catch (\Exception $e) {
                $this->error("Failed to send to $email: " . $e->getMessage());
            }
        }
    }
}
