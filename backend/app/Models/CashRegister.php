<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class CashRegister extends BaseModel {
    use HasFactory;

    public function entries() {
        return $this->hasMany(Cash::class);
    }
}
