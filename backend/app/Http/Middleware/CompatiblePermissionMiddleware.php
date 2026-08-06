<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Support\Facades\Auth;
use Spatie\Permission\Exceptions\UnauthorizedException;
use Spatie\Permission\Middleware\PermissionMiddleware;

class CompatiblePermissionMiddleware extends PermissionMiddleware {
    public function handle($request, Closure $next, $permission, $guard = null) {
        $permissions = is_array($permission) ? $permission : explode('|', $permission);

        if (Auth::user()?->hasAnyPermission($permissions)) {
            return $next($request);
        } else {
            throw UnauthorizedException::forPermissions($permissions);
        }
    }
}
