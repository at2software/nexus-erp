<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ReleaseSessionLock {
    public function handle(Request $request, Closure $next): Response {
        if (session()->isStarted()) {
            session()->save();
        }
        return $next($request);
    }
}
