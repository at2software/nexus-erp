<?php

namespace App\Http\Controllers;

use App\Helpers\NLog;
use App\Models\User;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\ClientException;
use Illuminate\Support\Facades\File;
use ReflectionClass;

abstract class PluginController extends Controller {
    protected $client;
    protected $baseUri;

    abstract public static function getKey(): string;
    protected function init(string $baseUri): void {
        $this->getClient($baseUri);
    }
    abstract protected function getToken(): string;
    protected function getHeaders(): array {
        return [
            'Content-Type'  => 'application/json',
            'Authorization' => 'Bearer '.$this->getToken(),
        ];
    }
    protected function getClient(string $baseUri): Client {
        $this->baseUri = $baseUri;
        if (! $this->client) {
            $this->client = new Client([
                'verify'   => false,
                'base_uri' => $this->baseUri,
                'headers'  => ['Content-Type' => 'application/json'],
            ]);
        }
        return $this->client;
    }
    protected function get($path, $payload = []): mixed {
        return $this->curl('get', $path, ['json' => $payload]);
    }
    protected function delete($path, $payload = []): mixed {
        return $this->curl('delete', $path, ['json' => $payload]);
    }
    protected function put($path, $payload = []): mixed {
        return $this->curl('put', $path, ['json' => $payload]);
    }
    protected function post($path, $payload = []): mixed {
        return $this->curl('post', $path, ['json' => $payload]);
    }
    protected function patch($path, $payload = []): mixed {
        return $this->curl('patch', $path, ['json' => $payload]);
    }
    protected function curl($method, $path, $payload = []): mixed {
        $payload = array_merge(['headers' => $this->getHeaders()], $payload);
        $url     = $this->baseUri.$path;
        try {
            if (! $this->client) {
                return null;
            }
            $response = $this->client->{$method}($url, $payload);
            $data     = json_decode($response->getBody(), true);
            return $data;
        } catch (ClientException $e) {
            NLog::error($e->getMessage());
        } catch (\Exception $e) {
            NLog::error($e->getMessage());
        }
        return null;
    }
    public function getIdFor(User $user): ?string {
        $param = 'MY_'.static::getKey().'_'.preg_replace('#https?://(.*?)/.*#is', '$1', $this->env('ENDPOINT'));
        return $user->param($param)->value;
    }
    public static function getByKey(string $key, ?string $restrictToClass = null): ?static {
        return collect(static::getPluginControllers($restrictToClass))
            ->first(fn ($c) => $c::getKey() === $key);
    }
    public static function getPluginControllers(?string $restrictToClass = null): array {
        $instances = [];

        $controllerClasses = collect(File::allFiles(app_path('Http/Controllers')))
            ->map(function ($file) {
                $relativePath = $file->getRelativePathname();
                $class        = 'App\\Http\\Controllers\\'.str_replace(['/', '.php'], ['\\', ''], $relativePath);
                return $class;
            })
            ->filter(function ($class) use ($restrictToClass) {
                $reflection = new ReflectionClass($class);
                $restricted = $restrictToClass ? is_subclass_of($class, $restrictToClass) : true;
                return class_exists($class) && is_subclass_of($class, PluginController::class) && ! $reflection->isAbstract() && $restricted;
            })
            ->values();

        foreach ($controllerClasses as $controllerClass) {
            try {
                $instance = $controllerClass::createInstance();
                if ($instance !== null) {
                    $instances[] = $instance;
                }
            } catch (\Exception $e) {
                // Skip controllers that can't be instantiated or aren't properly configured
                continue;
            }
        }
        return $instances;
    }
}
