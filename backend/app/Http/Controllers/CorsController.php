<?php

namespace App\Http\Controllers;

use App\Helpers\NLog;
use Str;

class CorsController extends Controller {
    public function curlId(int $id) {
        $this->validateRequest(['idKey' => 'required|string']);
        $url = request('url').'?'.request('idKey').'='.$id;
        return $this->_curl($url);
    }
    public function curl() {
        $this->validateRequest();
        return $this->_curl(request('url'));
    }
    private function validateRequest($additional=[]) {
        request()->validate(array_merge([
            'method' => 'required|in:get,post,put,delete,patch',
            'url'    => 'required|string',
        ]), $additional);
    }
    private function _curl(string $url) {
        $headers = request('headers', []);
        $ch      = curl_init();

        curl_setopt_array($ch, [
            CURLOPT_URL            => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_SSL_VERIFYHOST => 0,
            CURLOPT_SSL_VERIFYPEER => 0,
            CURLOPT_CUSTOMREQUEST  => Str::upper(request('method')),
            // Critical: Add timeouts to prevent blocking
            CURLOPT_CONNECTTIMEOUT => 2,    // 2 seconds to establish connection
            CURLOPT_TIMEOUT        => 5,            // 5 seconds max for entire request
            // Performance optimizations
            CURLOPT_ENCODING       => '',          // Accept gzip/deflate
            CURLOPT_TCP_NODELAY    => true,     // Disable Nagle's algorithm for faster response
            CURLOPT_FOLLOWLOCATION => true,  // Follow redirects
            CURLOPT_MAXREDIRS      => 3,          // Max 3 redirects
        ]);

        if (request('method') === 'post') {
            curl_setopt($ch, CURLOPT_POST, 1);
        }
        if (request('data')) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(request('data')));
        }

        $server_output = curl_exec($ch);
        $curl_error    = curl_error($ch);
        $http_code     = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        // Handle CURL errors (timeout, connection failed, etc)
        if ($server_output === false) {
            NLog::warning("CORS request failed for {$url}: {$curl_error}");
            return response()->json(['error' => 'External service unavailable', 'details' => $curl_error], 503);
        }

        $obj             = json_decode($server_output);
        $jsonDecodeError = json_last_error();

        if ($jsonDecodeError) {
            // If JSON decode fails, return the raw response for plain text endpoints like /healthz
            if ($jsonDecodeError === JSON_ERROR_SYNTAX && is_string($server_output)) {
                return response()->json(['raw_response' => trim($server_output)]);
            }
            NLog::error("JSON decode error for {$url}: {$server_output}");
            NLog::error($jsonDecodeError);
            return response()->json(['error' => 'Invalid JSON response'], 500);
        }
        return $obj;
    }
}
