<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Response;

class AddHeaders {
    public function handle($request, Closure $next) {
        $response = $next($request);
        try {
            if ($response instanceof Response) {
                $response->headers->set('Access-Control-Max-Age', '0');
                $response->headers->set('Cache-Control', 'no-cache, must-revalidate');
                $response->headers->set('Access-Control-Expose-Headers', 'Last-Modified');
            }
        } finally {
        }
        return $response;
    }
}
