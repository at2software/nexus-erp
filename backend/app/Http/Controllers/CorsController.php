<?php

namespace App\Http\Controllers;

use App\Helpers\NLog;
use App\Http\Requests\Cors\CurlIdRequest;
use App\Http\Requests\Cors\CurlRequest;
use App\Services\SafeUrlGuard;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class CorsController extends Controller {
    public function __construct(private SafeUrlGuard $guard) {}

    public function curlId(CurlIdRequest $request, int $id) {
        $url = $request->validated('url').'?'.$request->validated('idKey').'='.$id;
        $this->guard->validate($url);

        return $this->send($url);
    }
    public function curl(CurlRequest $request) {
        $url = $request->validated('url');
        $this->guard->validate($url);

        return $this->send($url);
    }
    private function send(string $url, int $hopsLeft = 3): mixed {
        $method  = Str::upper(request('method'));
        $headers = $this->parseHeaders(request('headers', []));
        $timeout = (int)request('timeout', 5);
        $data    = request('data');

        $options = ['allow_redirects' => false];
        $body    = [];
        if ($data) {
            $body = in_array($method, ['POST', 'PUT', 'PATCH'])
                ? ['json' => $data]
                : ['query' => $data];
        }

        $response = Http::withHeaders($headers)
            ->timeout($timeout)
            ->connectTimeout(2)
            ->withOptions($options)
            ->send($method, $url, $body);

        // Follow redirects manually so every hop is re-validated
        if ($response->redirect() && $hopsLeft > 0) {
            $location = $response->header('Location');
            if (! $location) {
                return response()->json(['error' => 'Redirect without Location header'], 502);
            }
            $location = $this->resolveLocation($url, $location);
            $this->guard->validate($location);

            return $this->send($location, $hopsLeft - 1);
        }

        $body    = $response->body();
        $decoded = json_decode($body);

        if (json_last_error() !== JSON_ERROR_NONE) {
            if (is_string($body)) {
                return response()->json(['raw_response' => trim($body)]);
            }
            NLog::error("JSON decode error for {$url}");

            return response()->json(['error' => 'Invalid JSON response'], 500);
        }

        return $decoded;
    }
    private function parseHeaders(array $rawHeaders): array {
        $headers = [];
        foreach ($rawHeaders as $line) {
            $parts = explode(':', $line, 2);
            if (count($parts) === 2) {
                $headers[trim($parts[0])] = trim($parts[1]);
            }
        }

        return $headers;
    }
    private function resolveLocation(string $baseUrl, string $location): string {
        if (preg_match('#^https?://#i', $location)) {
            return $location;
        }
        $parts = parse_url($baseUrl);
        $port  = isset($parts['port']) ? ':'.$parts['port'] : '';

        return $parts['scheme'].'://'.$parts['host'].$port.$location;
    }
}
