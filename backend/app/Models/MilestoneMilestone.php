<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class MilestoneMilestone extends BaseModel {
    use HasFactory;

    protected $access = ['admin' => '*', 'project_manager'=>'*', 'user'=>'*'];
}
