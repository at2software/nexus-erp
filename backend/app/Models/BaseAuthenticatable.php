<?php

namespace App\Models;

use App\Traits\CustomModelTrait;
use App\Traits\PrecomputedTrait;
use Illuminate\Foundation\Auth\User as Authenticatable;

class BaseAuthenticatable extends Authenticatable {
    use CustomModelTrait;
    use PrecomputedTrait;
}
