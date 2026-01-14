<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use App\Mail\AdminOtpMail;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class SecurityController extends Controller
{
    public function validatePin(Request $request)
    {
        $request->validate(['pin' => 'required|string']);
        
        $user = Auth::user();
        
        // Ensure user is allowed to be admin (1 or 2)
        if ($user->is_admin === 0) {
            return response()->json(['message' => 'Unauthorized access level'], 403);
        }

        if (!$user->pin || !Hash::check($request->pin, $user->pin)) {
            return response()->json(['message' => 'Invalid PIN'], 401);
        }

        // PIN valid, generate and send OTP
        $otp = rand(100000, 999999);
        $user->update([
            'two_factor_code' => $otp,
            'two_factor_expires_at' => Carbon::now()->addMinutes(10),
        ]);

        try {
            Mail::to($user->email)->queue(new AdminOtpMail($otp));
        } catch (\Exception $e) {
            Log::error("Failed to queue OTP email: " . $e->getMessage());
            return response()->json(['message' => 'Failed to send OTP email'], 500);
        }

        return response()->json(['message' => 'PIN verified. OTP sent to email.']);
    }

    public function verifyOtp(Request $request)
    {
        $request->validate(['otp' => 'required|string']);

        $user = Auth::user();

        if ($user->two_factor_code !== $request->otp) {
            return response()->json(['message' => 'Invalid OTP'], 401);
        }

        if (Carbon::now()->gt($user->two_factor_expires_at)) {
            return response()->json(['message' => 'OTP expired'], 401);
        }

        // Clear OTP
        $user->update([
            'two_factor_code' => null,
            'two_factor_expires_at' => null,
        ]);

        return response()->json(['message' => 'Admin access granted', 'admin_level' => $user->is_admin]);
    }
}
