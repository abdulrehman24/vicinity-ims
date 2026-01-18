<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\View;
use App\Models\Setting;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $defaultTitle = 'Vicinity IMS - Equipment Dashboard';
        $defaultFavicon = asset('favicon.ico');

        $appTitle = $defaultTitle;
        $faviconUrl = $defaultFavicon;

        if (Schema::hasTable('settings')) {
            $storedTitle = Setting::where('key', 'app_title')->value('value');
            $storedFavicon = Setting::where('key', 'app_favicon_url')->value('value');
            if ($storedTitle) {
                $appTitle = $storedTitle;
            }
            if ($storedFavicon) {
                $faviconUrl = $storedFavicon;
            }
        }

        View::share('appTitle', $appTitle);
        View::share('appFavicon', $faviconUrl);
    }
}
