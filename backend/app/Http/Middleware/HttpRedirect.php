<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;

class HttpRedirect {
    public function handle(Request $request, Closure $next) {
        if (! $request->secure() && App::environment('production') && str_starts_with(config('app.url'), 'https://')) {
            return redirect()->to(rtrim((string)config('app.url'), '/').$request->getRequestUri());
        }
        return $next($request);
    }
}
