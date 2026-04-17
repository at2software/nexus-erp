<?php

namespace App\Http\Middleware;

use App\Models\Contact;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class At2ConnectAuthMiddleware {
    /**
     * Handle an incoming request.
     *
     * @param Closure(Request): (Response) $next
     */
    public function handle(Request $request, Closure $next): Response {
        $token = $request->bearerToken();
        if (empty($token)) {
            return response()->json([], Response::HTTP_UNAUTHORIZED);
        }
        $contact = Contact::where('at2_connect_token', $token)->get();
        if ($contact->count() == 0) {
            return response()->json([], Response::HTTP_NOT_FOUND);
        }
        return $next($request);
    }
}
