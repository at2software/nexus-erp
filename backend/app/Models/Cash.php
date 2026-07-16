<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class Cash extends BaseModel {
    use HasFactory;

    protected function casts(): array {
        return [
            'value' => 'double',
        ];
    }

    protected $fillable = ['occured_at', 'value', 'approver', 'description'];

    public function entries() {
        return $this->belongsTo(CashRegister::class);
    }
}
