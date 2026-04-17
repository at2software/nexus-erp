<?php

namespace App\Models;

use Illuminate\Database\Eloquent\SoftDeletes;

class DebriefPositive extends BaseModel {
    use SoftDeletes;

    protected $table    = 'debrief_positives';
    protected $fillable = ['title', 'description', 'debrief_problem_category_id', 'reported_by_user_id'];
    protected $appends  = ['class', 'icon'];
    protected $access   = ['admin' => '*', 'project_manager' => 'cru'];

    public function projectDebriefs() {
        return $this->belongsToMany(DebriefProjectDebrief::class, 'debrief_positive_project_debrief')
            ->withPivot(['id', 'reported_by_user_id'])
            ->withTimestamps();
    }
    public function category() {
        return $this->belongsTo(DebriefProblemCategory::class, 'debrief_problem_category_id');
    }
    public function reportedBy() {
        return $this->belongsTo(User::class, 'reported_by_user_id');
    }
    public function scopeSearch($query, $term) {
        $words = array_filter(preg_split('/[\s\-_]+/', trim($term)), fn ($w) => strlen($w) > 0);
        return $query->where(function ($q) use ($words) {
            foreach ($words as $word) {
                $q->where(function ($inner) use ($word) {
                    $inner->where('title', 'LIKE', "%{$word}%")
                        ->orWhere('description', 'LIKE', "%{$word}%");
                });
            }
        });
    }
}
