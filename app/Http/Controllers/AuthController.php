<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Socialite\Facades\Socialite;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Carbon\Carbon;

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

        if (!$user || !Hash::check($credentials['password'], $user->password)) {
             return response()->json([
                'message' => 'Invalid email or password.',
            ], 422);
        }

        if (!$user->is_approved) {
             return response()->json([
                'message' => 'Your account is pending approval by an administrator.',
            ], 403);
        }

        if ($user->expires_at && Carbon::parse($user->expires_at)->isPast()) {
             return response()->json([
                'message' => 'Your account has expired.',
            ], 403);
        }

        if (!Auth::attempt($credentials, true)) {
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
}
