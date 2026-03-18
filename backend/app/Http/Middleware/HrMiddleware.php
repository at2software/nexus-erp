<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Spatie\Permission\Exceptions\UnauthorizedException;
use Symfony\Component\HttpFoundation\Response;

class HrMiddleware {
    public function handle(Request $request, Closure $next): Response {
        $requestedUser = $request->route('_');
        if (! ($requestedUser instanceof User)) {
            $requestedUser = User::findOrFail($requestedUser);
        }
        $user = Auth::User();
        if (Auth::id() == $requestedUser->id) {
            return $next($request);
        }
        if (! $user->hasAnyRole(['admin', 'hr', 'project_manager'])) {
            throw UnauthorizedException::forRolesOrPermissions([]);
        }
        return $next($request);
    }
}
