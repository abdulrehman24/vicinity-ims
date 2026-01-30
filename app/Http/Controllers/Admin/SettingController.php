<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;

class SettingController extends Controller
{
    private function ensureSuperAdmin(): void
    {
        if (! auth()->user() || auth()->user()->is_admin < 2) {
            abort(403);
        }
    }

    public function resetDatabase()
    {
        $this->ensureSuperAdmin();

        try {
            // Clean storage/app/public directory before seeding
            File::cleanDirectory(storage_path('app/public'));

            Artisan::call('migrate:fresh', ['--seed' => true, '--force' => true]);
            return response()->json(['message' => 'Database reset successfully']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to reset database: ' . $e->getMessage()], 500);
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

    public function showAuditSettings(Request $request)
    {
        // Allow access if user is admin (check middleware or ensureSuperAdmin if strictly for super admins)
        // StockTake page is for admins, so this should be fine.
        if (! auth()->user() || auth()->user()->is_admin < 1) {
            abort(403);
        }

        $interval = Setting::where('key', 'audit_interval_months')->value('value');
        $nextDate = Setting::where('key', 'audit_next_date')->value('value');

        return response()->json([
            'audit_interval_months' => $interval ? (int) $interval : 6,
            'audit_next_date' => $nextDate ?: null,
        ]);
    }

    public function updateAuditSettings(Request $request)
    {
        $this->ensureSuperAdmin();

        $data = $request->validate([
            'audit_interval_months' => ['required', 'integer', 'min:1', 'max:60'],
            'audit_next_date' => ['nullable', 'date'],
        ]);

        Setting::updateOrCreate(
            ['key' => 'audit_interval_months'],
            ['value' => (string) $data['audit_interval_months']]
        );

        if (array_key_exists('audit_next_date', $data)) {
            Setting::updateOrCreate(
                ['key' => 'audit_next_date'],
                ['value' => $data['audit_next_date']]
            );
        }

        return response()->json([
            'audit_interval_months' => $data['audit_interval_months'],
            'audit_next_date' => $data['audit_next_date'] ?? null,
        ]);
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
            $backgroundUrl = asset('storage/'.$path);
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
            $faviconUrl = asset('storage/'.$faviconPath);
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
