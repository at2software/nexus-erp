<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ReleaseSessionLock {
    /**
     * Release session lock for read-only API endpoints to allow parallel requests.
     * Applied after authentication but before controller execution.
     */
    public function handle(Request $request, Closure $next): Response {
        if (session()->isStarted()) {
            session()->save();
        }
        return $next($request);
    }
}
