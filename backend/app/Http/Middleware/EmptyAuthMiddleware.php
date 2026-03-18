<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EmptyAuthMiddleware {
    public function handle(Request $request, Closure $next): Response {
        $username = $request->getUser();
        if (empty($username)) {
            $response  = $this->createUnauthorizedResponse();
            $response->headers->set('WWW-Authenticate', 'Basic realm="_"');
            return $response;
        }
        return $next($request);
    }
    public function createUnauthorizedResponse() {
        $response = new Response;
        $response->setStatusCode(401);
        return $response;
    }
}
