<?php

namespace App\Http\Middleware;

use App\Models\Contact;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class At2ConnectAuthMiddleware {
    /**
     * @param Closure(Request): (Response) $next
     */
    public function handle(Request $request, Closure $next): Response {
        $token = $request->bearerToken();
        if (empty($token)) {
            return response()->json([], Response::HTTP_UNAUTHORIZED);
        }
        if (Contact::where('at2_connect_token', $token)->doesntExist()) {
            return response()->json([], Response::HTTP_NOT_FOUND);
        }
        return $next($request);
    }
}
