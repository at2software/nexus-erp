<?php

namespace App\Casts;

use App\Http\Middleware\Auth;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

class Permission implements CastsAttributes {
    public function __construct(protected ?string $role = null) {}

    public function get(Model $model, string $key, mixed $value, array $attributes): mixed {
        if (Auth::user() && $this->role && ! Auth::user()->hasRole($this->role)) {
            return null;
        }
        return $value;
    }
    public function set(Model $model, string $key, mixed $value, array $attributes): mixed {
        return $value;
    }
}
