<?php

namespace App\Http\Middleware;

use Closure;
use Spatie\Permission\Exceptions\UnauthorizedException;
use Spatie\Permission\Middleware\RoleMiddleware;

class CompatibleRoleMiddleware extends RoleMiddleware {
    public function handle($request, Closure $next, $role, $guard = null) {
        $roles = is_array($role)
            ? $role
            : explode('|', $role);

        if (! Auth::User()->hasAnyRole($roles)) {
            throw UnauthorizedException::forRoles($roles);
        }
        return $next($request);
    }
}
