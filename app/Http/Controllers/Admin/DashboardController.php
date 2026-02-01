<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Equipment;
use App\Models\User;
use App\Models\SupportTicket;
use Illuminate\Http\Request;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index()
    {
        // User Analytics
        $users = [
            'total' => User::count(),
            'active' => User::where('is_approved', true)->count(),
            'pending' => User::where('is_approved', false)->count(),
            'admins' => User::where('is_admin', '>=', 1)->count(),
        ];

        // Inventory Analytics
        $inventory = [
            'total' => Equipment::count(),
            'available' => Equipment::where('status', 'available')->count(),
            'on_loan' => Equipment::where('status', 'unavailable')->count(), // Assuming unavailable means on loan usually
            'maintenance' => Equipment::where('status', 'maintenance')->count(),
            'missing' => Equipment::where('status', 'missing')->count(),
        ];

        // Booking Analytics
        $bookings = [
            'total' => Booking::count(),
            'pending' => Booking::where('status', 'pending')->count(),
            'approved' => Booking::where('status', 'approved')->count(),
            'picked_up' => Booking::where('status', 'picked_up')->count(),
            'returned' => Booking::where('status', 'returned')->count(),
            'cancelled' => Booking::where('status', 'cancelled')->count(),
            'overdue' => Booking::where('status', 'picked_up')
                ->where('end_date', '<', Carbon::now())
                ->count(),
        ];

        // Ticket Analytics
        $tickets = [
            'total' => SupportTicket::count(),
            'open' => SupportTicket::where('status', 'open')->count(),
            'in_progress' => SupportTicket::where('status', 'in_progress')->count(),
            'resolved' => SupportTicket::where('status', 'resolved')->count(),
        ];
        
        // Recent Activity (Last 5 bookings)
        $recentBookings = Booking::with('user')
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get()
            ->map(function ($booking) {
                return [
                    'id' => $booking->id,
                    'user' => $booking->user ? $booking->user->name : 'Unknown',
                    'project' => $booking->project_title,
                    'status' => $booking->status,
                    'date' => $booking->created_at->diffForHumans(),
                ];
            });

        return response()->json([
            'users' => $users,
            'inventory' => $inventory,
            'bookings' => $bookings,
            'tickets' => $tickets,
            'recent_bookings' => $recentBookings,
        ]);
    }
}
