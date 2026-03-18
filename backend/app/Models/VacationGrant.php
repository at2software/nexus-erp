<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class VacationGrant extends BaseModel {
    use HasFactory;

    protected $casts = [
        'expires_at' => 'date',
        'amount'     => 'double',
    ];
    protected $access   = ['admin' => '*', 'project_manager'=>'r', 'user'=>'r'];
    protected $fillable = ['user_id', 'amount', 'name', 'expires_at'];

    public function user() {
        return $this->belongsTo(User::class);
    }
    public function vacations() {
        return $this->hasMany(Vacation::class);
    }
}
