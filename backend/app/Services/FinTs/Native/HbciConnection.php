<?php

namespace App\Services\FinTs\Native;

/**
 * Sends base64-encoded HBCI messages over HTTP POST and returns the decoded response.
 */
class HbciConnection {
    private mixed $curlHandle = null;

    public function __construct(
        private string $url,
        private string $caBundle = '',
        private int    $timeoutConnect = 15,
        private int    $timeoutResponse = 30,
    ) {}

    public function send(string $message): string {
        if ($this->curlHandle === null) {
            $this->curlHandle = curl_init() ?: throw new \RuntimeException('Failed to initialize cURL.');
            curl_setopt($this->curlHandle, CURLOPT_SSL_VERIFYPEER, true);
            curl_setopt($this->curlHandle, CURLOPT_SSL_VERIFYHOST, 2);
            if ($this->caBundle !== '') {
                curl_setopt($this->curlHandle, CURLOPT_CAINFO, $this->caBundle);
            }
            curl_setopt($this->curlHandle, CURLOPT_USERAGENT, 'phpFinTS');
            curl_setopt($this->curlHandle, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($this->curlHandle, CURLOPT_URL, $this->url);
            curl_setopt($this->curlHandle, CURLOPT_CONNECTTIMEOUT, $this->timeoutConnect);
            curl_setopt($this->curlHandle, CURLOPT_CUSTOMREQUEST, 'POST');
            curl_setopt($this->curlHandle, CURLOPT_HTTP_VERSION, CURL_HTTP_VERSION_1_1);
            curl_setopt($this->curlHandle, CURLOPT_ENCODING, '');
            curl_setopt($this->curlHandle, CURLOPT_MAXREDIRS, 0);
            curl_setopt($this->curlHandle, CURLOPT_TIMEOUT, $this->timeoutResponse);
            curl_setopt($this->curlHandle, CURLOPT_HTTPHEADER, [
                'cache-control: no-cache',
                'Content-Type: text/plain',
            ]);
        }

        curl_setopt($this->curlHandle, CURLOPT_POSTFIELDS, base64_encode($message));
        $response = curl_exec($this->curlHandle);

        if ($response === false) {
            throw new \RuntimeException(
                'FinTS cURL error for ' . $this->url . ': ' . curl_error($this->curlHandle)
            );
        }

        $status = curl_getinfo($this->curlHandle, CURLINFO_HTTP_CODE);
        if ($status < 200 || $status > 299) {
            throw new \RuntimeException("FinTS server returned HTTP {$status}");
        }

        return base64_decode($response);
    }

    public function __destruct() {
        if ($this->curlHandle !== null) {
            curl_close($this->curlHandle);
        }
    }
}
