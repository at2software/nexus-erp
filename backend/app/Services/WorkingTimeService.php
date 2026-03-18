<?php

namespace App\Services;

use App\Http\Controllers\VacationController;
use App\Models\User;

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
        return [
            'data'           => $fociData,
            'holidays'       => $holidays,
            'vacation_start' => $vacationStart->values(),
            'vacation_end'   => $vacationEnd->values(),
        ];
    }
}
