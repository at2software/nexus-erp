<?php

namespace App\Providers;

use App\Models\MarketingProspect;
use App\Observers\MarketingProspectObserver;
use Illuminate\Auth\Events\Registered;
use Illuminate\Auth\Listeners\SendEmailVerificationNotification;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider {
    public function register(): void {}
    public function boot(): void {
        MarketingProspect::observe(MarketingProspectObserver::class);

        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(300)->by($request->user()?->id ?: $request->ip());
        });

        Event::listen(Registered::class, SendEmailVerificationNotification::class);
    }
}
