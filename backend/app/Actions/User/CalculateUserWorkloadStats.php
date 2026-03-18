<?php

namespace App\Actions\User;

use App\Models\User;

class CalculateUserWorkloadStats {
    public function execute(User $user, array $workData, array $holidays): array {
        $hpwArray = $user->getHpwArray();

        $vacationDays  = [];
        $vacationStart = $workData['vacation_start'] ?? collect();
        $vacationEnd   = $workData['vacation_end'] ?? collect();

        foreach (array_merge($vacationStart->toArray(), $vacationEnd->toArray()) as $vacation) {
            $start = new \DateTime($vacation['started_at']);
            $end   = new \DateTime($vacation['ended_at']);
            while ($start <= $end) {
                $vacationDays[] = $start->format('Y-m-d');
                $start->modify('+1 day');
            }
        }
        $vacationDays = array_unique($vacationDays);

        $data     = $workData['data'] ?? collect();
        $startDay = strtotime($data->first()->key ?? now()->subDays(28)->format('Y-m-d'));
        $endDay   = strtotime('yesterday midnight');

        $cday         = $startDay;
        $workloadData = [];
        $workMap      = $data->keyBy('key');

        while ($cday <= $endDay) {
            $dayString      = date('Y-m-d', $cday);
            $duration       = $workMap->get($dayString)?->value ?? 0;
            $workloadData[] = $this->calculateDayWorkload($user, $cday, $duration, $holidays, $vacationDays, $hpwArray);
            $cday           = strtotime('+1 day', $cday);
        }

        $workingHoursTotal  = array_reduce($workloadData, fn ($carry, $_) => $carry + $_['value'], 0);
        $requiredHoursTotal = array_reduce($workloadData, fn ($carry, $_) => $carry + $_['required'], 0);

        $hpw = $user->getHpw();
        if ($requiredHoursTotal > 0) {
            $average = round($hpw * $workingHoursTotal / $requiredHoursTotal, 1);
        } else {
            $average = 0;
        }

        $averageClass = 'average-okay';
        if ($average < $hpw * 0.9) {
            $averageClass = 'average-warning';
        }
        if ($average < $hpw * 0.8) {
            $averageClass = 'average-danger';
        }
        return [
            'workinfo'     => $workloadData,
            'average'      => $average,
            'averageClass' => $averageClass,
        ];
    }
    private function calculateDayWorkload(User $user, int $day, float $duration, array $holidays, array $vacationDays, array $hpwArray): array {
        $class     = 'work-bar-default';
        $dayString = date('Y-m-d', $day);
        $dayOfWeek = (int)date('N', $day);

        $req = $hpwArray[($dayOfWeek - 1) % 7] ?? 0;

        $isVacation = in_array($dayString, $vacationDays) ||
                      in_array($dayString, $holidays) ||
                      $dayOfWeek >= 6;

        if ($isVacation) {
            $class = 'work-bar-holiday';
            $req   = 0;
        } elseif ($req > 0 && $duration < (0.95 * $req)) {
            $class = 'work-bar-danger';
        }
        return [
            'day'      => date('d.m.Y', $day),
            'value'    => $duration,
            'class'    => $class,
            'required' => $req,
        ];
    }
}
