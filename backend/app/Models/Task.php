<?php

namespace App\Models;

use App\Enums\TaskState;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Task extends BaseModel {
    use HasFactory;

    protected $fillable = ['parent_type', 'parent_id', 'name', 'description', 'link', 'status', 'due_date'];

    protected function casts(): array {
        return ['status' => TaskState::class];
    }

    // Relations
    public function parent() {
        return $this->morphTo();
    }
    public function assignee() {
        return $this->morphOne(Assignment::class, 'parent')->with('assignee');
    }
}
