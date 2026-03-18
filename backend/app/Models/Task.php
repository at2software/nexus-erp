<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class Task extends BaseModel {
    use HasFactory;

    protected $access   = ['admin' => '*', 'project_manager'=>'cru', 'user'=>'cru'];
    protected $fillable = ['parent_type', 'parent_id', 'name', 'description', 'link', 'status', 'due_date'];

    // Relations
    public function parent() {
        return $this->morphTo();
    }
    public function assignee() {
        return $this->morphOne(Assignment::class, 'parent')->with('assignee');
    }
}
