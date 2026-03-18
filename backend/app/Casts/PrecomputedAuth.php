<?php

namespace App\Casts;

use App\Http\Middleware\Auth;
use Illuminate\Database\Eloquent\Model;

class PrecomputedAuth extends Precomputed {
    public function __construct(protected ?string $role = 'financial') {}

    public function get(Model $model, string $key, mixed $value, array $attributes): mixed {
        if (Auth::user() && $this->role && ! Auth::user()->hasRole($this->role)) {
            return null;
        }
        $val = parent::get($model, $key, $value, $attributes);
        $val = floatval($val);
        return $val;
    }
}
