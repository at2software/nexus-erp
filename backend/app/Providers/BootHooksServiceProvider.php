<?php

namespace App\Providers;

use App\Http\Controllers\Controller;
use App\Models\BaseModel;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\ServiceProvider;

class BootHooksServiceProvider extends ServiceProvider {
    public function register(): void {
        $this->resolve(Controller::class, '__boot');
    }
    protected function resolve($class, $prefix) {
        $this->app->resolving($class, function ($controller, $app) use ($prefix) {
            $methods = get_class_methods($controller);
            foreach ($methods as $method) {
                if (str_starts_with($method, $prefix)) {
                    $controller->$method();
                }
            }
        });
    }
    public function boot(): void {
        Validator::extend('poly_exists', function ($attribute, $value, $parameters, $validator) {
            return BaseModel::fromPath($value) ? true : false;
        });
    }
}
