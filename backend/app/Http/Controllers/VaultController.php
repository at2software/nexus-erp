<?php

namespace App\Http\Controllers;

use App\Models\Vault;
use Illuminate\Http\Request;

class VaultController extends Controller {
    public function index() {
        return Vault::indexVaults();
    }
    public function store(Request $request) {
        $requestKeys = collect($request->all())->keys()->filter(fn ($_) => strlen($request->$_));

        if ($requestKeys->isEmpty()) {
            return response()->json(['success'=>false, 'error_description'=>'No keys submitted.'], 400);
        }

        $firstKeyParts = explode('_', $requestKeys->first());
        if (count($firstKeyParts) < 2) {
            return response()->json(['success'=>false, 'error_description'=>'Undefined prefix.'], 400);
        }

        $prefix    = $firstKeyParts[0];
        $vault     = Vault::getVault($prefix);
        $vaultKeys = Vault::getVaultKeys($prefix);
        if (! $vault || ! $vaultKeys) {
            return response()->json(['success'=>false, 'error_description'=>"vault prefix '$prefix' not supported"], 400);
        }
        foreach ($request->keys() as $key) {
            if (! $vaultKeys->contains($key)) {
                return response()->json(['success'=>false, 'error_description'=>"key '$key' not allowed by vault '$prefix'"], 400);
            }
        }

        $controllerClass = $vault['controller'];
        if (! method_exists($controllerClass, 'checkCredentials')) {
            return response()->json(['success'=>false, 'error_description'=>"controller '$controllerClass' does not support `checkCredentials`"], 400);
        }

        $controller          = new $controllerClass;
        $originalCredentials = $controller->getCredentials();
        $credentials         = collect($originalCredentials)->merge($requestKeys->filter(fn ($key) => filled($request->$key))->mapWithKeys(fn ($key) => [$key => $request->$key]))->all();

        $controller = new $controllerClass($credentials);
        if (! $controller->checkCredentials()) {
            return response()->json(['success'=>false, 'error_description'=>'Invalid credentials.'], 400);
        }

        $requestKeys->each(function ($key) use ($originalCredentials, $request) {
            if ($request->$key !== ($originalCredentials[$key] ?? null)) {
                Vault::updateOrCreate(
                    ['key' => $key],
                    ['value' => $request->$key]
                );
            }
        });
        return response()->json(['success'=>true, 'message'=>'Credentials stored successfully.'], 200);
    }
}
