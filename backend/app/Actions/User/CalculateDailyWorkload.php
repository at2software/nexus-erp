<?php

namespace App\Actions\User;

use App\Enums\MilestoneState;
use App\Http\Controllers\VacationController;
use App\Models\Company;
use App\Models\Milestone;
use App\Models\Param;
use App\Models\User;
use Carbon\Carbon;
use Carbon\CarbonPeriod;

class CalculateDailyWorkload {
    public function execute(User $user, Carbon $startDate, Carbon $endDate): array {
        $hpwArray    = $user->getHpwArray();
        $breakDays   = $this->getBreakDays($user, $startDate, $endDate);
        $assignments = $this->getWeeklyAssignments($user);
        $milestones  = $this->getMilestonesInRange($user, $startDate, $endDate);

        $dailyWorkload = [];
        $period        = CarbonPeriod::create($startDate, $endDate);

        foreach ($period as $date) {
            $dailyWorkload[] = $this->calculateDayWorkload(
                $user,
                $date,
                $hpwArray,
                $breakDays,
                $assignments,
                $milestones
            );
        }

        $unconfiguredMilestones = $this->getUnconfiguredMilestones($user);

        return [
            'user_id'                  => $user->id,
            'start_date'               => $startDate->format('Y-m-d'),
            'end_date'                 => $endDate->format('Y-m-d'),
            'hpw'                      => $user->getHpw(),
            'hpw_array'                => $hpwArray,
            'daily_workload'           => $dailyWorkload,
            'unconfigured_milestones'  => $unconfiguredMilestones,
        ];
    }
    private function calculateDayWorkload(
        User $user,
        Carbon $date,
        array $hpwArray,
        array $breakDays,
        array $assignments,
        $milestones
    ): array {
        $dayOfWeek      = $date->dayOfWeekIso - 1;
        $availableHours = $hpwArray[$dayOfWeek] ?? 0;
        $dateStr        = $date->format('Y-m-d');
        $isBreak        = isset($breakDays[$dateStr]) || $availableHours == 0;

        if ($isBreak) {
            return [
                'date'             => $dateStr,
                'day_of_week'      => $dayOfWeek,
                'total_percent'    => 0,
                'available_hours'  => 0,
                'assignment_hours' => 0,
                'milestone_hours'  => 0,
                'total_hours'      => 0,
                'is_break'         => true,
                'break_type'       => $breakDays[$dateStr]['type'] ?? 'weekend',
                'break_name'       => $breakDays[$dateStr]['name'] ?? null,
                'elements'         => [],
            ];
        }

        $workingDaysPerWeek = $this->countWorkingDays($hpwArray);
        $elements           = [];
        $assignmentHours    = 0;
        $milestoneHours     = 0;

        foreach ($assignments as $assignment) {
            $dailyHours       = $workingDaysPerWeek > 0 ? $assignment['hours_weekly'] / $workingDaysPerWeek : 0;
            $assignmentHours += $dailyHours;
            $elements[]       = [
                'type'         => 'assignment',
                'id'           => $assignment['id'],
                'name'         => $assignment['name'],
                'hours'        => round($dailyHours, 2),
                'project_id'   => $assignment['project_id'],
                'project_path' => $assignment['project_path'],
                'project'      => $assignment['project'],
            ];
        }

        $activeMilestones = $milestones->filter(function ($milestone) use ($date) {
            $dueAt = $milestone->due_at ? Carbon::parse($milestone->due_at)->endOfDay() : null;
            if (! $dueAt || $date->gt($dueAt)) {
                return false;
            }

            // If no started_at, treat as starting from today (or use due_at - duration)
            if ($milestone->started_at) {
                $startedAt = Carbon::parse($milestone->started_at)->startOfDay();
            } else {
                // No start date: assume it starts from today or due_at minus duration days
                $duration  = $milestone->duration ?? 1;
                $startedAt = $dueAt->copy()->subDays($duration)->startOfDay();
            }

            return $date->between($startedAt, $dueAt);
        });

        foreach ($activeMilestones as $milestone) {
            $dailyHours      = $this->getMilestoneDailyHours($milestone, $user, $hpwArray, $breakDays);
            $milestoneHours += $dailyHours;
            $elements[]      = [
                'type'             => 'milestone',
                'id'               => $milestone->id,
                'name'             => $milestone->name,
                'hours'            => round($dailyHours, 2),
                'project_id'       => $milestone->project_id,
                'project_name'     => $milestone->project?->name,
                'project'          => $milestone->project,
                'workload_percent' => $milestone->computed_workload_percent,
            ];
        }

        $totalHours   = $assignmentHours + $milestoneHours;
        $totalPercent = $availableHours > 0 ? ($totalHours / $availableHours) * 100 : 0;

        return [
            'date'             => $dateStr,
            'day_of_week'      => $dayOfWeek,
            'total_percent'    => round($totalPercent, 1),
            'available_hours'  => $availableHours,
            'assignment_hours' => round($assignmentHours, 2),
            'milestone_hours'  => round($milestoneHours, 2),
            'total_hours'      => round($totalHours, 2),
            'is_break'         => false,
            'elements'         => $elements,
        ];
    }
    public function getBreakDays(User $user, Carbon $startDate, Carbon $endDate): array {
        $breakMap = [];

        $approvedVacations = $user->approvedVacations($startDate->copy()->subDay(), $endDate->copy()->addDay())->get();
        foreach ($approvedVacations as $vac) {
            $period = CarbonPeriod::create($vac->started_at, $vac->ended_at);
            foreach ($period as $date) {
                $breakMap[$date->format('Y-m-d')] = [
                    'type' => 'vacation',
                    'name' => $vac->comment ?: 'Vacation',
                ];
            }
        }

        $sickNotes = $user->currentSickNotes($startDate->copy()->subDay(), $endDate->copy()->addDay())->get();
        foreach ($sickNotes as $sick) {
            $period = CarbonPeriod::create($sick->started_at, $sick->ended_at);
            foreach ($period as $date) {
                $breakMap[$date->format('Y-m-d')] = [
                    'type' => 'sick',
                    'name' => 'Sick leave',
                ];
            }
        }

        $holidays = app(VacationController::class)->indexHolidays($user->work_zip ?? '87435');
        foreach ($holidays as $holiday) {
            $holidayDate = Carbon::parse($holiday->datum);
            if ($holidayDate->between($startDate, $endDate)) {
                $breakMap[$holidayDate->format('Y-m-d')] = [
                    'type' => 'holiday',
                    'name' => $holiday->name,
                ];
            }
        }

        return $breakMap;
    }
    public function getWeeklyAssignments(User $user): array {
        $assignments = [];
        $meId        = (int)Param::get('ME_ID')->value;

        // Get ALL assignments for the user (projects + companies) with hours_weekly
        $allAssignments = \App\Models\Assignment::where('assignee_id', $user->id)
            ->where('assignee_type', 'App\\Models\\User')
            ->where('hours_weekly', '>', 0)
            ->with('parent')
            ->get();

        foreach ($allAssignments as $assignment) {
            $parent = $assignment->parent;
            if (! $parent) {
                continue;
            }

            $isProject = $assignment->parent_type === 'App\\Models\\Project';
            $isCompany = $assignment->parent_type === 'App\\Models\\Company';

            // Skip assignments to ME_ID company (organizational)
            if ($isCompany && ((int)$parent->id) === $meId) {
                continue;
            }

            // Skip projects with company_id = ME_ID
            if ($isProject && ((int)$parent->company_id) === $meId) {
                continue;
            }

            $assignments[] = [
                'id'           => $assignment->id,
                'name'         => $parent->name ?? 'Unknown',
                'hours_weekly' => $assignment->hours_weekly,
                'project'      => $isProject ? $parent : null,
                'project_id'   => $isProject ? $parent->id : null,
                'project_path' => $isProject ? '/projects/'.$parent->id : '/customers/'.$parent->id,
            ];
        }

        return $assignments;
    }
    public function getMilestonesInRange(User $user, Carbon $startDate, Carbon $endDate) {
        $meId = (int)Param::get('ME_ID')->value;

        return Milestone::where('user_id', $user->id)
            ->whereNot('state', MilestoneState::DONE)
            ->where(function ($query) use ($startDate, $endDate) {
                // Milestone overlaps with date range if:
                // - due_at >= startDate (milestone ends after our range starts)
                // - AND (started_at <= endDate OR started_at is null - milestone starts before our range ends, or hasn't started yet)
                $query->whereDate('due_at', '>=', $startDate)
                    ->where(function ($q) use ($endDate) {
                        $q->whereDate('started_at', '<=', $endDate)
                            ->orWhereNull('started_at');
                    });
            })
            ->with(['project', 'invoiceItems'])
            ->whereHas('project', function ($query) use ($meId) {
                $query->where('company_id', '!=', $meId);
            })
            ->get();
    }
    public function getMilestoneDailyHours(Milestone $milestone, User $user, array $hpwArray, array $breakDays): float {
        $workloadPercent = $milestone->computed_workload_percent;

        if ($workloadPercent === null || $workloadPercent === 0) {
            return 0;
        }

        $avgDailyHours = $user->hpd;
        return ($workloadPercent / 100) * $avgDailyHours;
    }
    private function countWorkingDays(array $hpwArray): int {
        return count(array_filter($hpwArray, fn ($hours) => $hours > 0));
    }
    public function getUnconfiguredMilestones(User $user): array {
        return Milestone::where('user_id', $user->id)
            ->where(function ($query) {
                $query->whereNull('workload_hours')
                    ->orWhere('workload_hours', 0);
            })
            ->whereNot('state', MilestoneState::DONE)
            ->whereDoesntHave('invoiceItems')
            ->with('project')
            ->get()
            ->map(fn ($m) => [
                'id'           => $m->id,
                'name'         => $m->name,
                'project'      => $m->project,
                'project_id'   => $m->project_id,
                'project_name' => $m->project?->name,
                'due_at'       => $m->due_at,
                'started_at'   => $m->started_at,
            ])
            ->toArray();
    }
    public function getWorkingDaysInMilestoneRange(Milestone $milestone, array $hpwArray, array $breakDays): int {
        $startDate    = Carbon::parse($milestone->started_at)->startOfDay();
        $dueDate      = Carbon::parse($milestone->due_at)->endOfDay();
        $period       = CarbonPeriod::create($startDate, $dueDate);
        $workingDays  = 0;

        foreach ($period as $date) {
            $dayOfWeek = $date->dayOfWeekIso - 1;
            $dateStr   = $date->format('Y-m-d');

            if (($hpwArray[$dayOfWeek] ?? 0) > 0 && ! isset($breakDays[$dateStr])) {
                $workingDays++;
            }
        }

        return max($workingDays, 1);
    }
}
