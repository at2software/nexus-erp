<?php

namespace App\Console\Commands\Cronjobs;

use App\Helpers\NLog;
use App\Models\Assignment;
use App\Models\Company;
use App\Models\Focus;
use App\Models\Project;
use App\Models\ProjectState;
use App\Models\User;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Console\Command;

class ComputeTimeBasedAssignmentAverages extends Command {
    protected $signature   = 'assignments:compute-timebased-averages';
    protected $description = 'Compute average hours per day for time-based and internal project assignments, and company assignments based on last 3 months of focus data';

    public function handle() {
        $this->info('Computing assignment averages...');

        $threeMonthsAgo = now()->subMonths(3)->startOfDay();
        $processedCount = 0;

        // Get all running time-based OR internal projects
        $projects = Project::where(function ($query) {
            $query->where('is_time_based', true)
                ->orWhere('is_internal', true);
        })
            ->whereHas('states', function ($query) {
                $query->where('progress', ProjectState::Running)
                    ->whereRaw('project_project_state.id = (
                        SELECT MAX(id) FROM project_project_state 
                        WHERE project_id = projects.id
                    )');
            })
            ->with(['assignees' => function ($query) {
                $query->where('assignee_type', User::class);
            }])
            ->get();

        $this->info("Found {$projects->count()} running time-based/internal projects");

        foreach ($projects as $project) {
            foreach ($project->assignees as $assignment) {
                $processedCount += $this->processAssignment($assignment, $project, Project::class, $threeMonthsAgo);
            }
        }

        // Get all company assignments
        $companies = Company::whereHas('assignees', function ($query) {
            $query->where('assignee_type', User::class);
        })
            ->with(['assignees' => function ($query) {
                $query->where('assignee_type', User::class);
            }])
            ->get();

        $this->info("Found {$companies->count()} companies with assignments");

        foreach ($companies as $company) {
            foreach ($company->assignees as $assignment) {
                $processedCount += $this->processAssignment($assignment, $company, Company::class, $threeMonthsAgo);
            }
        }

        if ($processedCount > 0) {
            $this->info("✓ Computed averages for {$processedCount} assignment(s)");
            NLog::info("ComputeTimeBasedAssignmentAverages: Processed {$processedCount} assignments");
        } else {
            $this->info('No assignments with focus data to process');
        }
        return Command::SUCCESS;
    }
    private function processAssignment(
        Assignment $assignment,
        $parent,
        string $parentType,
        Carbon $threeMonthsAgo
    ): int {
        $user = $assignment->assignee;

        if (! $user) {
            return 0;
        }

        $breakDays = $user->getBreakDays($threeMonthsAgo, now());
        $hpwArray  = $user->getHpwArray();

        // Get total hours from foci for this user on this parent in last 3 months
        $totalHours = Focus::where('parent_type', $parentType)
            ->where('parent_id', $parent->id)
            ->where('user_id', $user->id)
            ->where('started_at', '>=', $threeMonthsAgo)
            ->sum('duration');

        // Calculate total available working days in the period (excluding weekends, vacation, sick, holidays)
        $period               = CarbonPeriod::create($threeMonthsAgo, now());
        $availableWorkingDays = 0;

        foreach ($period as $date) {
            $dayOfWeek = $date->dayOfWeekIso - 1;
            $dateStr   = $date->format('Y-m-d');

            // Count if it's a working day (hpw > 0) and NOT a break day
            if (($hpwArray[$dayOfWeek] ?? 0) > 0 && ! isset($breakDays[$dateStr])) {
                $availableWorkingDays++;
            }
        }

        // Calculate average hours per available working day
        $avgHpd = $availableWorkingDays > 0 ? $totalHours / $availableWorkingDays : 0;

        // Only save if there's actual data
        if ($totalHours > 0 && $availableWorkingDays > 0) {
            $param        = $assignment->param('ASSIGNMENT_AVG_HPD');
            $param->value = round($avgHpd, 2);
            $param->save();

            $parentName     = $parent->name ?? 'Unknown';
            $parentTypeName = class_basename($parentType);

            NLog::info("Assignment #{$assignment->id}: User '{$user->name}' on {$parentTypeName} '{$parentName}' - AVG_HPD: ".round($avgHpd, 2)."h/day (total: {$totalHours}h over {$availableWorkingDays} available working days)");
            $this->info("  ✓ Assignment #{$assignment->id}: {$user->name} on '{$parentName}' - ".round($avgHpd, 2).'h/day');
            return 1;
        }
        return 0;
    }
}
