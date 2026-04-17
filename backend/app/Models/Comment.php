<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Comment extends BaseModel {
    use HasFactory;

    protected $fillable = ['path', 'text', 'user_id', 'parent_id', 'parent_type', 'is_mini', 'type'];
    protected $touches  = ['user', 'parent'];
    protected $access   = ['admin' => '*', 'project_manager' => 'cru', 'user' => 'cru'];

    public function getIconAttribute() {
        return 'users/'.$this->user_id.'/icon';
    }
    public function parent(): MorphTo {
        return $this->morphTo();
    }
    public function user() {
        return $this->belongsTo(User::class);
    }
}
