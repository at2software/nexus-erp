<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class AssignmentRole extends BaseModel {
    use HasFactory;

    protected $fillable = ['name'];
    protected $access   = ['admin' => '*', 'project_manager'=>'crud', 'user'=>'cru'];

    public function assignments() {
        return $this->hasMany(Assignment::class)->with('assignee');
    }
}
