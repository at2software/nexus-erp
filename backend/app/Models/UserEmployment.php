<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class UserEmployment extends BaseModel {
    use HasFactory;

    protected function casts(): array {
        return [
            'hpw' => 'double',
        ];
    }

    protected $fillable = ['description', 'is_time_based', 'mo', 'tu', 'we', 'th', 'fr', 'sa', 'su', 'user_id', 'started_at', 'is_active'];

    public function user() {
        return $this->belongsTo(User::class);
    }
}
