<?php

namespace App\Services;

use App\Models\Param;
use App\Models\Project;

class ProjectWageService {
    public function calculate(Project $project, ?float $baseWage = null): float {
        $baseWage = $baseWage ?? Param::get('HR_HOURLY_WAGE')->value;
        $discount = $project->company->param('INVOICE_DISCOUNT')->value;
        $discount = $discount ? 1 - (.01 * $discount) : 1;
        return $baseWage * $discount;
    }
}
