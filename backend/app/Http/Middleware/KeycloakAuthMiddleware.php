<?php

namespace App\Http\Middleware;

use Closure;
use GuzzleHttp\Client;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class KeycloakAuthMiddleware {
    public function handle(Request $request, Closure $next): Response {
        $username = $request->getUser();
        $password = $request->getPassword();
        if (empty($username) || empty($password)) {
            $response  = $this->createUnauthorizedResponse();
            $response->headers->set('WWW-Authenticate', 'Basic realm="_"');
            return $response;
        }

        $baseUrl  = env('KEYCLOAK_BASE_URL', '');
        $realm    = env('KEYCLOAK_REALM', '');
        $clientid = env('KEYCLOAK_CLIENT_ID', '');

        $client  = new Client(['base_uri' => $baseUrl]);
        $headers = ['Content-Type' => 'application/x-www-form-urlencoded'];
        try {
            $response = $client->post('realms/'.$realm.'/protocol/openid-connect/token', [$headers,
                'form_params' => [
                    'grant_type'    => 'password',
                    'audience'      => $clientid,
                    'username'      => $username,
                    'password'      => $password,
                ],
                'auth' => [
                    $clientid, '',
                ],
            ]);
        } catch (\Throwable $t) {
            return $this->createUnauthorizedResponse();
        }
        $body         = $response->getBody();
        $data         = $body->getContents();
        $json         = json_decode($data, true);
        $access_token = $json['access_token'];
        if ($access_token) {
            return $next($request);
        }
        return $this->createUnauthorizedResponse();
    }
    public function createUnauthorizedResponse() {
        $response = new Response;
        $response->setStatusCode(401);
        return $response;
    }
}
