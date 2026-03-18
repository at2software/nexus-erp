<?php

namespace App\Models;

use App\Builders\AssignmentBuilder;
use App\Traits\HasParams;
use App\Traits\HasTasksTrait;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Spatie\Permission\Models\Role;

class Assignment extends BaseModel {
    use HasFactory;
    use HasParams;
    use HasTasksTrait;

    const FLAG_MAIN_CONTACT = 1 << 0; // Binary flag: 1 (for main contact used in quotes/invoices)

    protected $fillable = ['role_id', 'parent_id', 'parent_type', 'assignee_id', 'assignee_type', 'hours_planned', 'flags'];
    protected $access   = ['admin' => '*', 'project_manager'=>'crud', 'user'=>'cru'];
    protected $appends  = ['avg_hpd'];

    public function getAvgHpdAttribute() {
        return $this->latestParamFor('ASSIGNMENT_AVG_HPD')->first()?->value;
    }
    public function role() {
        return $this->belongsTo(Role::class);
    }
    public function parent() {
        return $this->morphTo();
    }
    public function assignee() {
        return $this->morphTo();
    }
    public function links($parent_type, $assignee_type) {
        return $this->parent_type === $parent_type && $this->assignee_type === $assignee_type;
    }
    public function newEloquentBuilder($query) {
        return new AssignmentBuilder($query);
    }
}
