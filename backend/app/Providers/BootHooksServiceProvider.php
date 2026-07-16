<?php

namespace App\Providers;

use App\Models\BaseModel;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\ServiceProvider;

class BootHooksServiceProvider extends ServiceProvider {
    public function register(): void {
        // The controller-level crud_role/$access permission layer has been retired
        // in favour of explicit route role middleware (see routes/api.php). Model
        // boot hooks remain unaffected; see boot() below.
    }
    public function boot(): void {
        Validator::extend('poly_exists', function ($attribute, $value, $parameters, $validator) {
            return BaseModel::fromPath($value) ? true : false;
        });
    }
}
