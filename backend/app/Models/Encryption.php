<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class Encryption extends BaseModel {
    use HasFactory;

    protected $fillable = ['key', 'value', 'user_id'];
    protected $hidden   = ['created_at', 'updated_at', 'user_id', 'icon', 'class'];
    protected $access   = ['admin' => '*', 'project_manager'=>'crud', 'user'=>'crud'];

    public function user() {
        return $this->belongsTo(User::class);
    }
}
