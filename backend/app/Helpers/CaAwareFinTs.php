<?php

namespace App\Helpers;

use Fhp\Connection;
use Fhp\CurlException;
use Fhp\FinTs;
use Fhp\Options\Credentials;
use Fhp\Options\FinTsOptions;

/**
 * CaAwareConnection re-implements Connection::send() (the parent's connect() is private, so it cannot be
 * overridden) and explicitly sets CURLOPT_CAINFO. This is needed on Windows dev environments (e.g. Laragon)
 * where php.ini's curl.cainfo points to a file that no longer exists, and ini_set() is ineffective because
 * curl.cainfo is PHP_INI_SYSTEM.
 */
class CaAwareConnection extends Connection {
    private string $caBundle;

    public function __construct(string $url, int $timeoutConnect = 15, int $timeoutResponse = 30, string $caBundle = '') {
        parent::__construct($url, $timeoutConnect, $timeoutResponse);
        $this->caBundle = $caBundle;
    }

    public function send(string $message): string {
        if ($this->curlHandle === null) {
            $this->curlHandle = curl_init() ?: throw new CurlException('Failed initializing cURL.', null);
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
            curl_setopt($this->curlHandle, CURLOPT_HTTPHEADER, ['cache-control: no-cache', 'Content-Type: text/plain']);
        }

        curl_setopt($this->curlHandle, CURLOPT_POSTFIELDS, base64_encode($message));
        $response = curl_exec($this->curlHandle);

        if (false === $response) {
            throw new CurlException(
                'Failed sending to ' . $this->url . ': ' . curl_error($this->curlHandle),
                null,
                curl_errno($this->curlHandle),
                curl_getinfo($this->curlHandle),
                curl_error($this->curlHandle)
            );
        }

        $statusCode = curl_getinfo($this->curlHandle, CURLINFO_HTTP_CODE);
        if ($statusCode < 200 || $statusCode > 299) {
            throw new CurlException(
                'Bad response with status code ' . $statusCode,
                $response,
                $statusCode,
                curl_getinfo($this->curlHandle)
            );
        }

        return base64_decode($response);
    }
}

/**
 * FinTs subclass that injects CaAwareConnection via newConnection().
 * FinTs::$options is private, so we read it via reflection.
 */
class CaAwareFinTs extends FinTs {
    private string $caBundle = '';

    public static function new(FinTsOptions $options, Credentials $credentials, ?string $persistedInstance = null): FinTs {
        $instance = parent::new($options, $credentials, $persistedInstance);
        if ($instance instanceof self) {
            $instance->caBundle = self::resolveBundle();
        }
        return $instance;
    }

    protected function newConnection(): Connection {
        $prop = new \ReflectionProperty(FinTs::class, 'options');
        $prop->setAccessible(true);
        /** @var FinTsOptions $opts */
        $opts = $prop->getValue($this);
        return new CaAwareConnection($opts->url, $opts->timeoutConnect, $opts->timeoutResponse, $this->caBundle);
    }

    private static function resolveBundle(): string {
        $configured = ini_get('curl.cainfo');
        if ($configured && file_exists($configured)) {
            return $configured;
        }
        $fallback = base_path('vendor/composer/ca-bundle/res/cacert.pem');
        return file_exists($fallback) ? $fallback : '';
    }
}
