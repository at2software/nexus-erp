<?php

namespace App\Models;

use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;

class DebriefSolution extends BaseModel {
    use SoftDeletes;

    protected $table    = 'debrief_solutions';
    protected $fillable = ['title', 'description', 'created_by_user_id'];
    protected $appends  = ['class', 'icon'];
    protected $access   = ['admin' => '*', 'project_manager' => 'cru'];

    public function createdBy() {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }
    public function problems() {
        return $this->belongsToMany(DebriefProblem::class, 'debrief_problem_solution')
            ->withPivot(['id', 'debrief_project_debrief_id', 'effectiveness_rating', 'notes', 'linked_by_user_id'])
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
    public function updateAverageEffectiveness() {
        $avg = DB::table('debrief_problem_solution')
            ->where('debrief_solution_id', $this->id)
            ->whereNotNull('effectiveness_rating')
            ->avg('effectiveness_rating');

        $this->avg_effectiveness_rating = $avg;
        $this->save();
    }
    public function scopeSearch($query, $term) {
        return $query->where('title', 'like', "%{$term}%");
    }
    public function scopeOrderByUsage($query, $direction = 'desc') {
        return $query->orderBy('usage_count', $direction);
    }
    public function scopeOrderByEffectiveness($query, $direction = 'desc') {
        return $query->orderBy('avg_effectiveness_rating', $direction);
    }
}
