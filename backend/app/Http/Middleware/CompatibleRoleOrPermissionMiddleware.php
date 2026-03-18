<?php

namespace App\Http\Middleware;

use Closure;
use Spatie\Permission\Exceptions\UnauthorizedException;
use Spatie\Permission\Middleware\RoleOrPermissionMiddleware;

class CompatibleRoleOrPermissionMiddleware extends RoleOrPermissionMiddleware {
    public function handle($request, Closure $next, $roleOrPermission, $guard = null) {
        $rolesOrPermissions = is_array($roleOrPermission)
            ? $roleOrPermission
            : explode('|', $roleOrPermission);

        $user = Auth::User();
        if (! $user->hasAnyRole($rolesOrPermissions) && ! $user->hasAnyPermission($rolesOrPermissions)) {
            throw UnauthorizedException::forRolesOrPermissions($rolesOrPermissions);
        }
        return $next($request);
    }
}
