<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class CalendarEntry extends BaseModel {
    use HasFactory;

    protected $fillable = ['vcalendar', 'user_id'];

    public function user() {
        return $this->belongsTo(User::class);
    }
}
