<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class UserPaidTime extends BaseModel {
    use HasFactory;

    protected $fillable = ['paid_at', 'user_id', 'granted_by_user_id', 'raw', 'description', 'vacation'];
    protected $access   = ['admin' => '*'];

    public function user() {
        return $this->belongsTo(User::class);
    }
    public function granted_by() {
        return $this->belongsTo(User::class, 'granted_by_user_id');
    }
}
