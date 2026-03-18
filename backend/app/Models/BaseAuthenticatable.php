<?php

namespace App\Models;

use App\Traits\CustomModelTrait;
use App\Traits\PrecomputedTrait;
use Illuminate\Foundation\Auth\User as Authenticatable;

class BaseAuthenticatable extends Authenticatable {
    use CustomModelTrait;
    use PrecomputedTrait;

    /** Override in subclass to define CRUD access by role. Format: ['role' => '*' | 'crud'] */
    public function getAccess(): array {
        return $this->access ?? [];
    }
}
