<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    private function ensureSuperAdmin(): void
    {
        if (!auth()->user() || auth()->user()->is_admin < 2) {
            abort(403);
        }
    }

    public function publicLoginSettings()
    {
        $backgroundUrl = Setting::where('key', 'login_background_url')->value('value');
        $backgroundOpacity = Setting::where('key', 'login_background_opacity')->value('value');
        $appTitle = Setting::where('key', 'app_title')->value('value');
        $faviconUrl = Setting::where('key', 'app_favicon_url')->value('value');

        return response()->json([
            'background_url' => $backgroundUrl ?: null,
            'background_opacity' => $backgroundOpacity !== null ? (float) $backgroundOpacity : null,
            'app_title' => $appTitle ?: null,
            'app_favicon_url' => $faviconUrl ?: null,
        ]);
    }

    public function showLoginSettings(Request $request)
    {
        $this->ensureSuperAdmin();

        return $this->publicLoginSettings();
    }

    public function updateLoginSettings(Request $request)
    {
        $this->ensureSuperAdmin();

        $data = $request->validate([
            'background_url' => ['nullable', 'string', 'max:2048'],
            'background_opacity' => ['nullable', 'numeric', 'min:0', 'max:1'],
            'background_image' => ['nullable', 'image'],
            'app_title' => ['nullable', 'string', 'max:255'],
            'favicon_image' => ['nullable', 'image'],
        ]);

        $backgroundUrl = $data['background_url'] ?? null;

        if ($request->hasFile('background_image')) {
            $path = $request->file('background_image')->store('login-backgrounds', 'public');
            $backgroundUrl = asset('storage/' . $path);
        }

        Setting::updateOrCreate(
            ['key' => 'login_background_url'],
            ['value' => $backgroundUrl]
        );

        if (array_key_exists('background_opacity', $data)) {
            Setting::updateOrCreate(
                ['key' => 'login_background_opacity'],
                ['value' => (string) $data['background_opacity']]
            );
        }

        if (array_key_exists('app_title', $data)) {
            Setting::updateOrCreate(
                ['key' => 'app_title'],
                ['value' => $data['app_title']]
            );
        }

        if ($request->hasFile('favicon_image')) {
            $faviconPath = $request->file('favicon_image')->store('favicons', 'public');
            $faviconUrl = asset('storage/' . $faviconPath);
            Setting::updateOrCreate(
                ['key' => 'app_favicon_url'],
                ['value' => $faviconUrl]
            );
        } else {
            $faviconUrl = Setting::where('key', 'app_favicon_url')->value('value');
        }

        return response()->json([
            'background_url' => $backgroundUrl,
            'background_opacity' => $data['background_opacity'] ?? null,
            'app_title' => $data['app_title'] ?? null,
            'app_favicon_url' => $faviconUrl ?: null,
        ]);
    }
}
