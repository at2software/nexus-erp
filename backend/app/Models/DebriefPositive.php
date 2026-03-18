<?php

namespace App\Models;

use Illuminate\Database\Eloquent\SoftDeletes;

class DebriefPositive extends BaseModel {
    use SoftDeletes;

    protected $table    = 'debrief_positives';
    protected $fillable = ['debrief_project_debrief_id', 'title', 'description', 'debrief_problem_category_id', 'reported_by_user_id'];
    protected $appends  = ['class', 'icon'];
    protected $access   = ['admin' => '*', 'project_manager' => 'cru'];

    public function projectDebrief() {
        return $this->belongsTo(DebriefProjectDebrief::class, 'debrief_project_debrief_id');
    }
    public function category() {
        return $this->belongsTo(DebriefProblemCategory::class, 'debrief_problem_category_id');
    }
    public function reportedBy() {
        return $this->belongsTo(User::class, 'reported_by_user_id');
    }
    public function scopeSearch($query, $term) {
        return $query->where(function ($q) use ($term) {
            $q->where('title', 'LIKE', "%{$term}%")
                ->orWhere('description', 'LIKE', "%{$term}%");
        });
    }
}
