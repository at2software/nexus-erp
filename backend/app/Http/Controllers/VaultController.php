<?php

namespace App\Http\Controllers;

use App\Exceptions\TanChallengeException;
use App\Models\Vault;
use App\Services\FinTsBankService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class VaultController extends Controller {
    public function index() {
        return Vault::indexVaults();
    }

    public function store(Request $request) {
        $requestKeys = collect($request->all())->keys()->filter(fn ($_) => strlen($request->$_));

        if ($requestKeys->isEmpty()) {
            return response()->json(['success' => false, 'error_description' => 'No keys submitted.'], 400);
        }

        $firstKeyParts = explode('_', $requestKeys->first());
        if (count($firstKeyParts) < 2) {
            return response()->json(['success' => false, 'error_description' => 'Undefined prefix.'], 400);
        }

        $prefix    = $firstKeyParts[0];
        $vault     = Vault::getVault($prefix);
        $vaultKeys = Vault::getVaultKeys($prefix);
        if (! $vault || ! $vaultKeys) {
            return response()->json(['success' => false, 'error_description' => "vault prefix '$prefix' not supported"], 400);
        }
        foreach ($request->keys() as $key) {
            if (! $vaultKeys->contains($key)) {
                return response()->json(['success' => false, 'error_description' => "key '$key' not allowed by vault '$prefix'"], 400);
            }
        }

        $controllerClass = $vault['controller'];
        if (! method_exists($controllerClass, 'checkCredentials')) {
            return response()->json(['success' => false, 'error_description' => "controller '$controllerClass' does not support `checkCredentials`"], 400);
        }

        $controller          = new $controllerClass;
        $originalCredentials = $controller->getCredentials();
        $credentials         = collect($originalCredentials)->merge($requestKeys->filter(fn ($key) => filled($request->$key))->mapWithKeys(fn ($key) => [$key => $request->$key]))->all();

        $controller = new $controllerClass($credentials);

        try {
            if (! $controller->checkCredentials()) {
                return response()->json(['success' => false, 'error_description' => 'Invalid credentials.'], 400);
            }
        } catch (TanChallengeException $e) {
            Cache::put("fints_pending_{$e->getChallengeId()}_keys", [
                'prefix'       => $prefix,
                'credentials'  => $credentials,
                'request_keys' => $requestKeys->all(),
                'original'     => $originalCredentials,
            ], 300);
            return response()->json([
                'success'      => false,
                'tan_required' => true,
                'challenge_id' => $e->getChallengeId(),
                'challenge'    => $e->getChallenge(),
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'error_description' => $e->getMessage()], 400);
        }

        $this->saveCredentials($requestKeys, $originalCredentials, $request);
        return response()->json(['success' => true, 'message' => 'Credentials stored successfully.'], 200);
    }

    public function submitTan(Request $request) {
        $challengeId = $request->challenge_id;
        $tan         = $request->tan;

        $meta = Cache::get("fints_pending_{$challengeId}_keys");
        if (! $meta) {
            return response()->json(['success' => false, 'error_description' => 'Challenge expired. Please try again.'], 400);
        }

        $vault = Vault::getVault($meta['prefix']);
        if (! $vault) {
            return response()->json(['success' => false, 'error_description' => 'Unknown vault.'], 400);
        }

        $controller = new $vault['controller']($meta['credentials']);
        $result     = $controller->submitTan($challengeId, $tan ?: null);

        if ($result === null) {
            Cache::forget("fints_pending_{$challengeId}_keys");
            return response()->json(['success' => false, 'error_description' => 'Challenge expired. Please try again.'], 400);
        }

        if ($result === false) {
            return response()->json(['success' => false, 'waiting' => true]);
        }

        // TAN confirmed — save credentials
        $requestKeys       = collect($meta['request_keys']);
        $originalCreds     = $meta['original'];
        $credentialsToSave = $meta['credentials'];

        $requestKeys->each(function ($key) use ($originalCreds, $credentialsToSave) {
            $value = $credentialsToSave[$key] ?? null;
            if ($value !== null && $value !== ($originalCreds[$key] ?? null)) {
                Vault::updateOrCreate(['key' => $key], ['value' => $value]);
            }
        });

        Cache::forget("fints_pending_{$challengeId}_keys");
        return response()->json(['success' => true, 'message' => 'Authentication successful, credentials saved.']);
    }

    public function bankLookup(Request $request) {
        $iban = preg_replace('/\s+/', '', $request->query('iban', ''));
        $blz  = preg_replace('/\s+/', '', $request->query('blz', ''));

        if (! $blz && strlen($iban) >= 12 && strtoupper(substr($iban, 0, 2)) === 'DE') {
            $blz = substr($iban, 4, 8);
        }

        if (! $blz) {
            return response()->json(null);
        }

        return response()->json(FinTsBankService::lookupByBlz($blz));
    }

    private function saveCredentials($requestKeys, $originalCredentials, $request): void {
        $requestKeys->each(function ($key) use ($originalCredentials, $request) {
            if ($request->$key !== ($originalCredentials[$key] ?? null)) {
                Vault::updateOrCreate(
                    ['key' => $key],
                    ['value' => $request->$key]
                );
            }
        });
    }
}
