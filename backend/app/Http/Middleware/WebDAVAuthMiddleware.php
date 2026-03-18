<?php

namespace App\Http\Middleware;

use App\Models\Param;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class WebDAVAuthMiddleware {
    /**
     * Handle an incoming request.
     *
     * @param \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response) $next
     */
    public function handle(Request $request, Closure $next): Response {
        $username = $request->getUser();
        $password = $request->getPassword();
        if (empty($username) || empty($password)) {
            $response  = $this->createUnauthorizedResponse();
            $response->headers->set('WWW-Authenticate', 'Basic realm="_"');
            return $response;
        }

        $user        = User::where('email', $username)->firstOrFail();
        $webdavToken = Param::index($user->toPoly())['WEBDAV_TOKEN'] ?? null;

        if (empty($webdavToken)) {
            return $this->createUnauthorizedResponse('WebDAV Token not set');
        }
        if ($webdavToken != $password) {
            return $this->createUnauthorizedResponse();
        }
        return $next($request);
    }

    public function createUnauthorizedResponse($message=null) {
        $response = new Response;
        $response->setStatusCode(401);
        if (! empty($message)) {
            $response->setContent($message);
        }
        return $response;
    }
}
