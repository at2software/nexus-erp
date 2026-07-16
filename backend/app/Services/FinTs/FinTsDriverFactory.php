<?php

namespace App\Services\FinTs;

class FinTsDriverFactory {
    /**
     * Creates the driver selected by FINTS_DRIVER in .env.
     * 'native'   → our own Deutsche Bank NoPsd2 implementation
     * 'external' → nemiah/php-fints (default, all banks, full PSD2)
     */
    public static function create(array $credentials): FinTsDriverInterface {
        $driver = strtolower(config('services.fints.driver', 'external'));

        if ($driver === 'native') {
            return new NativeFinTsDriver($credentials);
        }

        return new ExternalFinTsDriver($credentials);
    }
}
