<?php

namespace App\Http\Middleware;

use App;
use Closure;
use Illuminate\Http\Request;

class HttpRedirect {
    public function handle(Request $request, Closure $next) {
        if (! $request->secure() && App::environment('production') && str_starts_with(config('app.url'), 'https://')) {
            return redirect()->secure($request->getRequestUri());
        }
        return $next($request);
    }
}
