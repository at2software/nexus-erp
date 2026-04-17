<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Spatie\Permission\Exceptions\UnauthorizedException;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware for controller-level CRUD access control via RBAC roles.
 * Reads the model's $access property to determine which roles can perform each operation.
 *
 * $access format: ['admin' => '*', 'project_manager' => 'cru', 'user' => 'r', ...]
 *   '*' = full access, otherwise letters: c=create, r=read, u=update, d=delete
 *
 * Usage: crud_role:crud.Company.read
 */
class CrudRoleMiddleware {
    private static array $opLetters = [
        'create' => 'c',
        'read'   => 'r',
        'update' => 'u',
        'delete' => 'd',
    ];

    public function handle(Request $request, Closure $next, string $permission, $guard = null): Response {
        // Parse "crud.ModelName.operation"
        $parts = explode('.', $permission);
        if (count($parts) !== 3 || $parts[0] !== 'crud') {
            return $next($request);
        }

        $modelClass = 'App\\Models\\'.$parts[1];
        $operation  = strtolower($parts[2]);

        if (! class_exists($modelClass)) {
            return $next($request);
        }

        $user = $request->user();
        if (! $user) {
            throw UnauthorizedException::forRolesOrPermissions([]);
        }

        if ($this->userCanPerform($user, $modelClass, $operation)) {
            return $next($request);
        }

        throw UnauthorizedException::forRolesOrPermissions([]);
    }
    protected function userCanPerform($user, string $modelClass, string $operation): bool {
        if ($user->hasRole('admin')) {
            return true;
        }

        $access = (new $modelClass)->getAccess();
        $letter = self::$opLetters[$operation] ?? $operation[0];

        foreach ($user->getRoleNames() as $roleName) {
            $perms = $access[$roleName] ?? null;
            if ($perms === null) {
                continue;
            }
            if ($perms === '*' || str_contains($perms, $letter)) {
                return true;
            }
        }
        return false;
    }
}
