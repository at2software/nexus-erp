<?php

namespace App\Models;

use Illuminate\Database\Eloquent\SoftDeletes;

class DebriefProjectDebrief extends BaseModel {
    use SoftDeletes;

    protected $table    = 'debrief_project_debriefs';
    protected $fillable = ['project_id', 'conducted_by_user_id', 'debriefed_user_id', 'conducted_at', 'summary_notes', 'rating', 'status'];
    protected $appends  = ['class', 'icon'];
    protected $casts    = [
        'conducted_at' => 'datetime',
    ];
    protected $access = ['admin' => '*', 'project_manager' => 'cru'];

    public function project() {
        return $this->belongsTo(Project::class);
    }
    public function conductedBy() {
        return $this->belongsTo(User::class, 'conducted_by_user_id');
    }
    public function debriefedUser() {
        return $this->belongsTo(User::class, 'debriefed_user_id');
    }
    public function problems() {
        return $this->belongsToMany(DebriefProblem::class, 'debrief_problem_project_debrief')
            ->withPivot(['id', 'severity', 'context_notes', 'reported_by_user_id'])
            ->withTimestamps();
    }
    public function positives() {
        return $this->belongsToMany(DebriefPositive::class, 'debrief_positive_project_debrief')
            ->withPivot(['id', 'reported_by_user_id'])
            ->withTimestamps();
    }
    public function isCompleted() {
        return $this->status === 'completed';
    }
    public function isDraft() {
        return $this->status === 'draft';
    }
    public function markAsCompleted() {
        $this->status               = 'completed';
        $this->conducted_at         = now();
        $this->conducted_by_user_id = request()->user()?->id;
        $this->save();
    }
    public function scopeCompleted($query) {
        return $query->where('status', 'completed');
    }
    public function scopeDraft($query) {
        return $query->where('status', 'draft');
    }
}
