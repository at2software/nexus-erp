<?php

namespace App\Traits;

use App\Models\Vault;
use Exception;

trait HasVaultCredentials {
    public $credentials = null;

    abstract public function checkCredentials(): bool;
    abstract public function vaultPrefix(): string;
    public function checkResponse($fn) {
        try {
            $response = $fn();
            if ($response) {
                return true;
            }
            return false;
        } catch (Exception $ex) {
            return false;
        }
    }
    public function getCredentials() {
        return Vault::getCredentials($this->vaultPrefix());
    }
    public function env(string $key): ?string {
        $fullKey = $this->vaultPrefix().'_'.$key;
        return isset($this->credentials[$fullKey]) ? $this->credentials[$fullKey] : null;
    }
}
