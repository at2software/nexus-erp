<?php

namespace App\Actions\User;

use App\Models\User;
use Carbon\Carbon;
use Carbon\CarbonPeriod;

class CalculateDailyWorkload {
    public function execute(User $user, Carbon $startDate, Carbon $endDate): array {
        $hpwArray    = $user->getHpwArray();
        $breakDays   = $user->getBreakDays($startDate, $endDate);
        $assignments = $user->getWeeklyAssignments();
        $milestones  = $user->milestonesInRange($startDate, $endDate);

        $dailyWorkload = [];
        foreach (CarbonPeriod::create($startDate, $endDate) as $date) {
            $dailyWorkload[] = $this->calculateDayWorkload($user, $date, $hpwArray, $breakDays, $assignments, $milestones);
        }

        return [
            'user_id'                 => $user->id,
            'start_date'              => $startDate->format('Y-m-d'),
            'end_date'                => $endDate->format('Y-m-d'),
            'hpw'                     => $user->getHpw(),
            'hpw_array'               => $hpwArray,
            'daily_workload'          => $dailyWorkload,
            'unconfigured_milestones' => $user->getUnconfiguredMilestones(),
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

        $workingDaysPerWeek = count(array_filter($hpwArray, fn ($hours) => $hours > 0));
        $elements           = [];
        $assignmentHours    = 0;
        $milestoneHours     = 0;

        foreach ($assignments as $assignment) {
            $dailyHours = $workingDaysPerWeek > 0 ? $assignment['hours_weekly'] / $workingDaysPerWeek : 0;
            $assignmentHours += $dailyHours;
            $elements[] = [
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
            if ($milestone->started_at) {
                $startedAt = Carbon::parse($milestone->started_at)->startOfDay();
            } else {
                $startedAt = $dueAt->copy()->subDays($milestone->duration ?? 1)->startOfDay();
            }
            return $date->between($startedAt, $dueAt);
        });

        foreach ($activeMilestones as $milestone) {
            $dailyHours = $milestone->getDailyHours($user);
            $milestoneHours += $dailyHours;
            $elements[] = [
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
}
