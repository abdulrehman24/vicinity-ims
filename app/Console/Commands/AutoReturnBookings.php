<?php

namespace App\Console\Commands;

use App\Models\Booking;
use App\Models\Equipment;
use App\Models\EquipmentLog;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AutoReturnBookings extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'bookings:auto-return';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Automatically return bookings whose end date has passed';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $today = now()->startOfDay();

        // Find all active bookings where end_date < today
        $expiredBookings = Booking::where('status', 'active')
            ->whereDate('end_date', '<', $today)
            ->with('equipments')
            ->get();

        if ($expiredBookings->isEmpty()) {
            $this->info('No expired active bookings found.');

            return 0;
        }

        $this->info('Found '.$expiredBookings->count().' expired active bookings. Starting auto-return process...');

        foreach ($expiredBookings as $booking) {
            DB::beginTransaction();
            try {
                $this->info("Processing Booking ID: {$booking->id} ({$booking->project_title})");

                // 1. Update pivot records in booking_equipment
                DB::table('booking_equipment')
                    ->where('booking_id', $booking->id)
                    ->where('status', 'active')
                    ->update([
                        'status' => 'returned',
                        'returned_at' => now(),
                        'return_condition' => 'good',
                        'return_notes' => 'Auto-returned by system (date passed)',
                        'updated_at' => now(),
                    ]);

                // 2. Update Equipment status
                foreach ($booking->equipments as $equipment) {
                    $originalStatus = $equipment->status;

                    if ($originalStatus === 'checked_out') {
                        $equipment->status = 'available';
                        $equipment->save();

                        // 3. Log the action
                        EquipmentLog::create([
                            'equipment_id' => $equipment->id,
                            'user_id' => null, // System
                            'user_name' => 'System Scheduler',
                            'action' => 'status_change',
                            'previous_status' => $originalStatus,
                            'new_status' => 'available',
                            'description' => "Auto-returned from Booking #{$booking->id} ({$booking->project_title})",
                        ]);
                    }
                }

                // 4. Update the Booking itself
                $booking->update([
                    'status' => 'returned',
                    'returned_at' => now(),
                ]);

                DB::commit();
                $this->info("Successfully auto-returned Booking ID: {$booking->id}");

            } catch (\Exception $e) {
                DB::rollBack();
                Log::error("Auto-return error for Booking ID {$booking->id}: ".$e->getMessage());
                $this->error("Failed to auto-return Booking ID: {$booking->id}");
            }
        }

        $this->info('Auto-return process completed.');

        return 0;
    }
}
