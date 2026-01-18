<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Socialite\Facades\Socialite;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function redirectToGoogle()
    {
        return Socialite::driver('google')->redirect();
    }

    public function handleGoogleCallback()
    {
        try {
            $googleUser = Socialite::driver('google')->stateless()->user();
        } catch (\Exception $e) {
            Log::error('Google Auth Failed: ' . $e->getMessage());
            return redirect('/')->with('error', 'Google authentication failed.');
        }

        $superAdminEmail = env('SUPER_ADMIN_EMAIL');
        $isSuperAdmin = $superAdminEmail && strcasecmp($googleUser->getEmail(), $superAdminEmail) === 0;

        $user = User::where('email', $googleUser->getEmail())->first();
        
        // Handle avatar download
        $avatarPath = $this->downloadAvatar($googleUser->getAvatar(), $googleUser->getId());

        if (!$user) {
            $user = User::create([
                'name' => $googleUser->getName(),
                'email' => $googleUser->getEmail(),
                'google_id' => $googleUser->getId(),
                'avatar' => $avatarPath,
                'password' => null,
                'is_admin' => $isSuperAdmin ? 2 : 0,
            ]);
        } else {
            // Update existing user with Google info
            $updateData = [];
            if (!$user->google_id) {
                $updateData['google_id'] = $googleUser->getId();
            }
            // Always update avatar if we have a new one
            if ($avatarPath) {
                $updateData['avatar'] = $avatarPath;
            }
            if ($isSuperAdmin && $user->is_admin < 2) {
                $updateData['is_admin'] = 2;
            }
            
            if (!empty($updateData)) {
                $user->update($updateData);
            }
        }

        Auth::login($user);
        
        return redirect('/');
    }

    private function downloadAvatar($url, $googleId)
    {
        try {
            if (empty($url)) return null;

            $contents = Http::get($url)->body();
            $filename = 'avatars/' . $googleId . '.jpg';
            
            // Save to public disk
            Storage::disk('public')->put($filename, $contents);
            
            // Return the accessible URL path
            return '/storage/' . $filename;
        } catch (\Exception $e) {
            Log::error('Failed to download avatar: ' . $e->getMessage());
            return null;
        }
    }
}
