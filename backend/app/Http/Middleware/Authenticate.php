<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Auth\Middleware\Authenticate as Middleware;
use Illuminate\Support\Facades\Auth;

class Authenticate extends Middleware {
    /**
     * Handle an incoming request.
     *
     * @param \Illuminate\Http\Request $request
     * @param string[] ...$guards
     * @return mixed
     *
     * @throws \Illuminate\Auth\AuthenticationException
     */
    public function handle($request, Closure $next, ...$guards) {
        // Check for Bearer token authentication first
        if ($request->hasHeader('Authorization')) {
            $token = preg_replace('/^Bearer /is', '', $request->header('Authorization'));
            if (strlen($token) > 0) {
                $user = User::where('api_token', $token)->first();
                if ($user) {
                    Auth::setUser($user);
                    return $next($request);
                }
            }
        }
        return parent::handle($request, $next, ...$guards);
    }

    /**
     * Get the path the user should be redirected to when they are not authenticated.
     */
    protected function redirectTo($request): ?string {
        // Always return null to trigger JSON response - this is a pure API backend
        return null;
    }
}
