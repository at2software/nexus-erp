<?php

namespace App\Providers;

use App\Models\MarketingProspect;
use App\Observers\MarketingProspectObserver;
use App\Services\DatabaseSchemaService;
use App\Support\LiveSyncBroadcaster;
use Illuminate\Auth\Events\Registered;
use Illuminate\Auth\Listeners\SendEmailVerificationNotification;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Events\MigrationsEnded;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider {
    public function register(): void {
        $this->app->singleton(LiveSyncBroadcaster::class);
    }
    public function boot(): void {
        MarketingProspect::observe(MarketingProspectObserver::class);

        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(300)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('icons', function (Request $request) {
            return Limit::perMinute(2000)->by($request->user()?->id ?: $request->ip());
        });

        Event::listen(Registered::class, SendEmailVerificationNotification::class);

        Event::listen(MigrationsEnded::class, fn () => Cache::forget(DatabaseSchemaService::CACHE_KEY));
    }
}
