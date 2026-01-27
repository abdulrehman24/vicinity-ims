<?php

namespace App\Http\Controllers;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'is_approved' => false, // Default to pending
        ]);

        // Don't login automatically if approval is required
        // Auth::login($user);

        return response()->json([
            'message' => 'Registration successful. Please wait for admin approval.',
            'user' => $user,
        ]);
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            return response()->json([
                'message' => 'Invalid email or password.',
            ], 422);
        }

        if (! $user->is_approved) {
            return response()->json([
                'message' => 'Your account is pending approval by an administrator.',
            ], 403);
        }

        if ($user->expires_at && Carbon::parse($user->expires_at)->isPast()) {
            return response()->json([
                'message' => 'Your account has expired.',
            ], 403);
        }

        if (! Auth::attempt($credentials, true)) {
            return response()->json([
                'message' => 'Invalid email or password.',
            ], 422);
        }

        $request->session()->regenerate();

        return response()->json([
            'message' => 'Logged in successfully.',
            'user' => Auth::user(),
        ]);
    }

    public function changePassword(Request $request)
    {
        $data = $request->validate([
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = Auth::user();

        $wasForced = $user->must_change_password;

        $user->forceFill([
            'password' => Hash::make($data['password']),
            'must_change_password' => false,
        ]);

        // If this was a forced password change (e.g. for a new collaborator),
        // we revoke approval and force them to wait for admin approval again.
        if ($wasForced) {
            $user->is_approved = false;
            $user->save();

            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return response()->json([
                'message' => 'Password updated. Please wait for admin approval to log in again.',
                'require_approval' => true,
            ]);
        }

        $user->save();

        return response()->json([
            'message' => 'Password updated successfully.',
            'user' => $user,
        ]);
    }

    public function sendResetOtp(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        $user = User::where('email', $request->email)->first();

        if (! $user) {
            return response()->json(['message' => 'We could not find a user with that email address.'], 404);
        }

        $otp = rand(100000, 999999);
        $user->otp_code = $otp;
        $user->otp_expires_at = Carbon::now()->addMinutes(15);
        $user->save();

        try {
            Mail::raw("Your OTP for password reset is: $otp. It expires in 15 minutes.", function ($message) use ($user) {
                $message->to($user->email)
                    ->subject('Password Reset OTP');
            });
        } catch (\Exception $e) {
            Log::error('Failed to send OTP email: '.$e->getMessage());

            return response()->json(['message' => 'Failed to send OTP email.'], 500);
        }

        return response()->json(['message' => 'OTP sent successfully.']);
    }

    public function verifyResetOtp(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'otp' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || $user->otp_code !== $request->otp || Carbon::parse($user->otp_expires_at)->isPast()) {
            return response()->json(['message' => 'Invalid or expired OTP.'], 400);
        }

        return response()->json(['message' => 'OTP verified.']);
    }

    public function resetPasswordWithOtp(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'otp' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || $user->otp_code !== $request->otp || Carbon::parse($user->otp_expires_at)->isPast()) {
            return response()->json(['message' => 'Invalid or expired OTP.'], 400);
        }

        $user->forceFill([
            'password' => Hash::make($request->password),
            'otp_code' => null,
            'otp_expires_at' => null,
            'must_change_password' => false,
        ])->save();

        return response()->json(['message' => 'Password reset successfully. You can now login.']);
    }
}
