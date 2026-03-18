<?php

namespace App\Models;

use App\Http\Controllers\At2ConnectController;
use App\Http\Controllers\PluginGitController;
use App\Http\Controllers\PluginLocalAiController;
use App\Http\Controllers\PluginMattermostController;
use Crypt;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

// secure storage for external credentials without ever exposing them again to the frontend
class Vault extends Model {
    public $incrementing  = false;
    protected $primaryKey = 'key';
    protected $keyType    = 'string';
    protected $fillable   = ['key', 'value'];

    protected function value(): Attribute {
        return Attribute::make(
            get: function ($val) {
                try {
                    return Crypt::decrypt($val);
                } catch (\Illuminate\Contracts\Encryption\DecryptException $e) {
                    return null;
                }
            },
            set: fn ($val) => Crypt::encrypt($val),
        );
    }
    public static function allVaults(): Collection {
        return collect([
            [
                'prefix'     => 'MATTERMOST',
                'name'       => 'Mattermost',
                'controller' => PluginMattermostController::class,
                'active'     => false,
                'keys'       => collect([
                    'ENDPOINT'    => 'URL',
                    'TEAM_ID'     => 'team id',
                    'TEAM_NAME'   => 'team name (URL slug)',
                    'LOGIN_ID'    => 'login',
                    'PASSWORD'    => 'password',
                    'TOWN_SQUARE' => 'broadcast channel id',
                ]),
            ],
            [
                'prefix'     => 'AT2CONNECT',
                'name'       => 'at²connect',
                'controller' => At2ConnectController::class,
                'active'     => false,
                'keys'       => collect([
                    'URL'    => 'URL',
                ]),
            ],
            [
                'prefix'     => 'GITLAB',
                'name'       => 'GitLab',
                'controller' => PluginGitController::class,
                'active'     => false,
                'keys'       => collect([
                    'URL'       => 'GitLab URL',
                    'TOKEN'     => 'access token',
                    'APIKEY'    => 'api key for webhooks',
                ]),
            ],
            // [
            //     'prefix'     => 'LOCALAI',
            //     'name'       => 'Local AI',
            //     'controller' => PluginLocalAiController::class,
            //     'active'     => false,
            //     'keys'       => collect([
            //         'ENDPOINT'    => 'URL',
            //         'USERNAME'     => 'user name',
            //         'PASSWORD'    => 'password',
            //     ])
            // ],
        ]);
    }
    public static function indexVaults(): Collection {
        $response = Vault::allVaults();
        $response = $response->map(function ($item) {
            $item['active'] = Vault::isActive($item['prefix']);
            return $item;
        });
        return $response;
    }
    public static function getVault($prefix): ?array {
        $response = Vault::allVaults()->filter(fn ($_) => $_['prefix'] === $prefix);
        return $response->first();
    }
    public static function getVaultKeys($prefix): ?Collection {
        if ($vault = Vault::getVault($prefix)) {
            return $vault['keys']->keys()->map(fn ($_) => $vault['prefix'].'_'.$_);
        }
        return null;
    }
    public static function isActive($prefix): bool {
        if ($keys = Vault::getVaultKeys($prefix)) {
            $existing = Vault::whereIn('key', $keys)->get()
                ->filter(fn ($_) => $_->value ? true : false)
                ->map(fn ($_) => $_->key);
            return $existing->sort()->values()->all() === $keys->sort()->values()->all();
        }
        return false;
    }
    public static function getCredentials($prefix): ?array {
        if ($keys = Vault::getVaultKeys($prefix)) {
            $flat = $keys->combine($keys->map(fn ($_) => null));
            $map  = Vault::whereIn('key', $keys)->get();
            $map->each(fn ($_) => $flat[$_->key] = $_->value ?? null);
            return $flat->toArray();
        }
        return null;
    }
}
