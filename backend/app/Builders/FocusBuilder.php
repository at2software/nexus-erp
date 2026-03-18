<?php

namespace App\Builders;

use App\Models\Company;
use App\Models\Param;
use App\Models\Project;
use Illuminate\Support\Facades\DB;

class FocusBuilder extends BaseBuilder {
    public function whereParent(Project|Company $obj) {
        return $this->where($obj->toPoly());
    }
    public function statsUid() {
        return $this->select('user_id', DB::raw("DATE_FORMAT(started_at, '%Y-%m') AS month"), DB::raw('SUM(duration) AS sum'))->oldest('month')->groupBy('user_id', 'month');
    }
    public function stats($prefix = '', $prefix2 = '') {
        return $this->select(DB::raw('DATE_FORMAT('.$prefix."started_at, '%Y-%m') AS month"), DB::raw('SUM('.$prefix2.'duration) AS sum'))->oldest('month')->groupBy('month');
    }
    public function withAll() {
        return $this->with('user', 'invoiceItem')->latest('started_at');
    }
    public function whereOrga() {
        $meId = Param::get('ME_ID')->value;
        return $this->where('parent_type', Company::class)->where('parent_id', $meId);
    }
    public function whereUnpaid() {
        return $this->where('is_unpaid', true);
    }
    public function whereTimeBasedCustomer() {
        $meId = Param::get('ME_ID')->value;
        return $this->where('parent_type', Company::class)->where('parent_id', '!=', $meId);
    }
    public function whereTimeBasedProject() {
        $meId = Param::get('ME_ID')->value;
        return $this->where('parent_type', Project::class)
            ->join('projects', function ($join) use ($meId) {
                $join->on('foci.parent_id', '=', 'projects.id')
                    ->where('projects.company_id', '!=', $meId)
                    ->where('projects.is_time_based', true);
            });
    }
    public function whereBudgetProject() {
        $meId = Param::get('ME_ID')->value;
        return $this->where('parent_type', Project::class)
            ->join('projects', function ($join) use ($meId) {
                $join->on('foci.parent_id', '=', 'projects.id')
                    ->where('projects.company_id', '!=', $meId)
                    ->where('projects.is_time_based', false);
            });
    }
    public function whereInternalProjects() {
        $meId = Param::get('ME_ID')->value;
        return $this->where('parent_type', Project::class)
            ->join('projects', function ($join) use ($meId) {
                $join->on('foci.parent_id', '=', 'projects.id')
                    ->where('projects.company_id', $meId);
            });
    }
}
