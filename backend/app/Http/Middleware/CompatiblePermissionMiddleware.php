<?php

namespace App\Http\Middleware;

use Closure;
use Spatie\Permission\Exceptions\UnauthorizedException;
use Spatie\Permission\Middleware\PermissionMiddleware;

class CompatiblePermissionMiddleware extends PermissionMiddleware {
    public function handle($request, Closure $next, $permission, $guard = null) {
        $permissions = is_array($permission) ? $permission : explode('|', $permission);

        if (Auth::User()?->hasAnyPermission($permissions)) {
            return $next($request);
        } else {
            // If the user does not have any of the required permissions, throw an UnauthorizedException
            throw UnauthorizedException::forPermissions($permissions);
        }
    }
}
