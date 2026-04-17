<?php

namespace App\Services;

use App\Http\Controllers\VacationController;
use App\Models\User;
use Carbon\CarbonPeriod;

class WorkingTimeService {
    public static function getWorkingTimeFor(User $user): array {
        $start = now()->subDays(28)->startOfDay();
        $end   = now()->endOfWeek();

        $vacationController = app(VacationController::class);
        $holidays           = array_map(fn ($_) => $_->datum, $vacationController->indexHolidays($user->work_zip));

        $fociData = $user->foci()
            ->whereBetween('started_at', [$start, $end])
            ->selectCluster('started_at', 'duration', '%Y-%m-%d')
            ->groupBy('key')
            ->get();

        $vacations = $user->vacations()
            ->where(function ($query) use ($start, $end) {
                $query->whereBetween('started_at', [$start, $end])
                    ->orWhereBetween('ended_at', [$start, $end]);
            })
            ->get();

        $vacationStart = $vacations->filter(fn ($v) => $v->started_at >= $start && $v->started_at <= $end);
        $vacationEnd   = $vacations->filter(fn ($v) => $v->ended_at >= $start && $v->ended_at <= $end);
        $payload       = [
            'data'           => $fociData,
            'holidays'       => $holidays,
            'vacation_start' => $vacationStart->values(),
            'vacation_end'   => $vacationEnd->values(),
        ];

        $workloadStats = $user->getWorkloadStats($payload, $holidays);
        $weeklyTotals  = self::getWeeklyTotals($user, $payload);
        return array_merge($payload, $workloadStats, [
            'required_hours'           => $user->getHpw(),
            'work_this_week'           => $weeklyTotals['work_this_week'],
            'required_work_this_week'  => $weeklyTotals['required_work_this_week'],
        ]);
    }
    private static function getWeeklyTotals(User $user, array $payload): array {
        $weekStart = now()->startOfWeek();
        $weekEnd   = now()->endOfWeek();

        $vacationDays = [];
        $vacations    = array_merge(
            $payload['vacation_start']->toArray(),
            $payload['vacation_end']->toArray()
        );
        foreach ($vacations as $vacation) {
            $start = new \DateTime($vacation['started_at']);
            $end   = new \DateTime($vacation['ended_at']);
            while ($start <= $end) {
                $vacationDays[] = $start->format('Y-m-d');
                $start->modify('+1 day');
            }
        }
        $vacationDays = array_unique($vacationDays);

        $workByDay = $payload['data']->keyBy('key');
        $hpwArray  = $user->getHpwArray();

        $workThisWeek     = 0.0;
        $requiredThisWeek = 0.0;

        foreach (CarbonPeriod::create($weekStart, $weekEnd) as $date) {
            $dayString  = $date->format('Y-m-d');
            $dayOfWeek  = (int)$date->format('N');
            $required   = $hpwArray[($dayOfWeek - 1) % 7] ?? 0;
            $isBreakDay = in_array($dayString, $vacationDays) || in_array($dayString, $payload['holidays']) || $dayOfWeek >= 6;

            $workThisWeek += (float)($workByDay->get($dayString)?->value ?? 0);
            if (! $isBreakDay) {
                $requiredThisWeek += (float)$required;
            }
        }

        return [
            'work_this_week'          => round($workThisWeek, 2),
            'required_work_this_week' => round($requiredThisWeek, 2),
        ];
    }
}
