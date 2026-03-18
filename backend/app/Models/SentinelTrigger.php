<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class SentinelTrigger extends BaseModel {
    use HasFactory;

    protected $access = ['admin' => '*', 'project_manager'=>'*', 'user'=>'*'];
}
