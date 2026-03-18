<?php

namespace App\Models;

class DebriefProblemCategory extends BaseModel {
    protected $table    = 'debrief_problem_categories';
    protected $fillable = ['name', 'color', 'icon', 'position'];
    protected $appends  = ['class', 'icon'];
    protected $access   = ['admin' => '*', 'project_manager' => 'r'];

    public function problems() {
        return $this->hasMany(DebriefProblem::class);
    }
    public function positives() {
        return $this->hasMany(DebriefPositive::class);
    }
}
