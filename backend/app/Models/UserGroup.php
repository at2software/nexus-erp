<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class UserGroup extends BaseModel {
    use HasFactory;

    protected $fillable = ['access'];

    public function users() {
        return $this->hasMany(User::class);
    }
    public function getAccessAttribute($value) {
        return ($json = @json_decode($value, true)) ? $json : [];
    }
    public function setAccessAttribute($value) {
        $this->attributes['access'] = json_encode($value);
    }
}
