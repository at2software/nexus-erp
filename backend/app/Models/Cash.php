<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class Cash extends BaseModel {
    use HasFactory;

    protected $casts = [
        'value' => 'double',
    ];
    protected $fillable = ['occured_at', 'value', 'approver', 'description'];
    protected $access   = ['admin' => '*', 'project_manager'=>'', 'user'=>''];

    public function entries() {
        return $this->belongsTo(CashRegister::class);
    }
}
