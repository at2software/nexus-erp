<?php

namespace App\Services;

use App\Http\Controllers\VacationController;
use App\Models\User;
use Carbon\Carbon;
use Carbon\CarbonPeriod;

class UserTimelineService {
    public function generate(User $user, $plannedSubscriptions = null, float $remainingHpw = 40, bool $withoutSubscriptions = false): array {
        $totalDays           = 60;
        $dailyAvailable      = $remainingHpw / 7;
        $totalAvailableHours = $dailyAvailable * $totalDays;

        $today         = now()->startOfDay();
        $endDate       = $today->copy()->addDays($totalDays);
        $currentOffset = 0;

        $breakMap = collect();

        $approvedVacations = $user->approvedVacations(now()->subDays(90), now()->addMonths(3))->get();
        $currentSickNotes  = $user->currentSickNotes(now()->subDays(90), now()->addMonths(3))->get();

        $holidays = app(VacationController::class)->indexHolidays($user->work_zip ?? '87435');
        foreach ($holidays as $holiday) {
            $day                             = Carbon::parse($holiday->datum);
            $breakMap[$day->format('Y-m-d')] = ['holiday', $holiday->name];
        }

        foreach ($approvedVacations as $vac) {
            $period = CarbonPeriod::create($vac->started_at, $vac->ended_at);
            foreach ($period as $date) {
                $name                             = "$vac->comment [".$vac->started_at->format('Y-m-d').' - '.$vac->ended_at->format('Y-m-d').']';
                $breakMap[$date->format('Y-m-d')] = ['vacation', $name];
            }
        }

        foreach ($currentSickNotes as $sick) {
            $period = CarbonPeriod::create($sick->started_at, $sick->ended_at);
            foreach ($period as $date) {
                $breakMap[$date->format('Y-m-d')] = ['sick', 'sick note'];
            }
        }

        $subsQueue  = $plannedSubscriptions ? $plannedSubscriptions->map(fn ($s) => ['id' => $s->id, 'class' => $s->class, 'name' => $s->name, 'hours' => $s->pivot->hours_planned])->values() : collect();
        $timeline   = [];
        $currentDay = 0;

        while ($today->lt($endDate)) {
            $dateStr = $today->format('Y-m-d');
            $isBreak = isset($breakMap[$dateStr]);

            if ($isBreak) {
                if ($withoutSubscriptions) {
                    $timeline[] = ['type' => $breakMap[$dateStr][0], 'id' => 0, 'left' => round($currentDay / $totalDays, 4), 'width' => round(1 / $totalDays, 4), 'days' => 1, 'name' => $breakMap[$dateStr][1]];
                } else {
                    $timeline[] = ['type' => $breakMap[$dateStr][0], 'id' => 0, 'left' => round($currentOffset / $totalAvailableHours, 4), 'width' => round($dailyAvailable / $totalAvailableHours, 4), 'days' => 1, 'name' => $breakMap[$dateStr][1]];
                    $currentOffset += $dailyAvailable;
                }
            } elseif (! $withoutSubscriptions && $subsQueue->isNotEmpty()) {
                $current     = $subsQueue->first();
                $hoursToPlan = min($dailyAvailable, $current['hours']);
                $timeline[]  = ['type' => $current['class'], 'id' => $current['id'], 'left' => round($currentOffset / $totalAvailableHours, 4), 'width' => round($hoursToPlan / $totalAvailableHours, 4), 'name' => $current['name'], 'days' => 1];
                $currentOffset += $hoursToPlan;
                $current['hours'] -= $hoursToPlan;
                if ($current['hours'] <= 0) {
                    $subsQueue->shift();
                } else {
                    $subsQueue->put(0, $current);
                }
            } elseif (! $withoutSubscriptions) {
                $currentOffset += $dailyAvailable;
            }

            $currentDay++;
            $today->addDay();
        }

        $grouped = [];
        $prev    = null;
        foreach ($timeline as $item) {
            if ($prev && $item['type'] === $prev['type'] && $item['id'] === $prev['id'] && (abs($prev['left'] + $prev['width'] - $item['left']) < 0.001)) {
                $prev['width'] += $item['width'];
                $prev['days']++;
            } else {
                if ($prev) {
                    $grouped[] = $prev;
                }
                $prev = $item;
            }
        }
        if ($prev) {
            $grouped[] = $prev;
        }
        return $grouped;
    }
}
