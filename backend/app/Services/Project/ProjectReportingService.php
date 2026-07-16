<?php

namespace App\Services\Project;

use App\Models\Project;

class ProjectReportingService {
    public function build(?string $startDate, ?string $endDate) {
        // Projects created in date range
        $createdQuery     = Project::whereBetween('created_at', [$startDate, $endDate]);
        $stateChangeQuery = Project::whereHas('states', fn ($q) => $q->whereBetween('project_project_state.created_at', [$startDate, $endDate]));

        $union = $createdQuery->union($stateChangeQuery);

        return $union->with(['company', 'states' => fn ($q) => $q->orderBy('project_project_state.created_at', 'asc')])
            ->orderBy('company_id', 'asc')
            ->orderBy('created_at', 'desc')
            ->get()
            ->unique()
            ->values();
    }
}
