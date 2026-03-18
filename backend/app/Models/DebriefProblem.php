<?php

namespace App\Models;

use Illuminate\Database\Eloquent\SoftDeletes;

class DebriefProblem extends BaseModel {
    use SoftDeletes;

    protected $table    = 'debrief_problems';
    protected $fillable = ['title', 'description', 'debrief_problem_category_id', 'created_by_user_id'];
    protected $appends  = ['class', 'icon'];
    protected $access   = ['admin' => '*', 'project_manager' => 'cru'];

    public function category() {
        return $this->belongsTo(DebriefProblemCategory::class, 'debrief_problem_category_id');
    }
    public function createdBy() {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }
    public function solutions() {
        return $this->belongsToMany(DebriefSolution::class, 'debrief_problem_solution')
            ->withPivot(['id', 'debrief_project_debrief_id', 'effectiveness_rating', 'notes', 'linked_by_user_id'])
            ->withTimestamps();
    }
    public function projectDebriefs() {
        return $this->belongsToMany(DebriefProjectDebrief::class, 'debrief_problem_project_debrief')
            ->withPivot(['id', 'severity', 'context_notes', 'reported_by_user_id'])
            ->withTimestamps();
    }
    public function incrementUsageCount() {
        $this->increment('usage_count');
    }
    public function decrementUsageCount() {
        if ($this->usage_count > 0) {
            $this->decrement('usage_count');
        }
    }
    public function scopeSearch($query, $term) {
        return $query->where(function ($q) use ($term) {
            $q->where('title', 'LIKE', "%{$term}%")
                ->orWhere('description', 'LIKE', "%{$term}%");
        });
    }
    public function scopeByCategory($query, $categoryId) {
        return $query->where('debrief_problem_category_id', $categoryId);
    }
    public function scopeOrderByUsage($query, $direction = 'desc') {
        return $query->orderBy('usage_count', $direction);
    }
}
