<?php

namespace App\Console\Commands\Cronjobs;

use App\Models\Company;
use App\Models\Focus;
use App\Models\Param;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class SupportRegression extends Command {
    const MAX_SLOPE        = 0.05;
    const INPUT_MIN_MONTHS = 3;
    const INPUT_MAX_MONTHS = 24;

    protected $signature   = 'cron:support-regression';
    protected $description = 'Command description';
    private $earliestDate;
    private $fnEarliest;

    public function handle() {
        $this->earliestDate = now()->subMonths(self::INPUT_MAX_MONTHS)->startOf('month');
        $this->fnEarliest   = fn ($query) => $query->where('foci.started_at', '>', $this->earliestDate);
        $table              = [];
        $total              = 0;

        $hourlyWage = Param::get('HR_HOURLY_WAGE')->value;

        foreach (Company::whereHas('timeBasedFoci', $this->fnEarliest)->get() as $company) {
            $discount = $company->param('INVOICE_DISCOUNT', false)->value ?? 0;
            $wage     = $hourlyWage * (1 - (.01 * $discount));
            $last12   = 0;    // eigentlicher Wert der in den letzten 12 Monaten abgerufenen Support-Zeiten (muss nicht unbedingt identisch mit dem sein, was tatsächlich am Ende berechnet wurde)
            $sum      = 0;
            for ($i = self::INPUT_MIN_MONTHS; $i < self::INPUT_MAX_MONTHS; $i++) {
                [$p, $o] = $this->predictForCompany($company, 12, $i, $wage);
                $sum += $p;
                if ($i == 12) {
                    $last12 = $o;
                }
            }
            $prediction = $sum / (self::INPUT_MAX_MONTHS - self::INPUT_MIN_MONTHS);
            $total += $prediction;
            $perc               = round($last12 > 0 ? 100 * ($prediction - $last12) / $last12 : 0);
            $table[]            = [$company->name, round($last12, 2).' €', round($prediction, 2).' €', $perc.' %', round($wage, 2).' €ph'];
            $linregParam        = $company->param('CASHFLOW_PROJECTS_LINREG');
            $linregParam->value = $prediction;
            $linregParam->save();

            $linregPercParam        = $company->param('CASHFLOW_PROJECTS_LINREG_%');
            $linregPercParam->value = $prediction;
            $linregPercParam->save();
        }
        $this->table(['name', 'last12', 'predicted', '%', 'wage'], $table);
        $totalParam        = Param::get('CASHFLOW_PROJECTS_LINREG');
        $totalParam->value = $total;
        $totalParam->save();
        echo $total.PHP_EOL;
    }
    public function predictFoci(array $foci, float $last, float $next, float $wage) {
        $x = [];
        for ($i = 0; $i < $last; $i++) {
            $x[$i] = $i;
        }
        $y = array_fill(0, $last, 0);
        foreach ($foci as $k => $_) {
            $t     = (new Carbon($_->month))->startOfMonth()->diffInMonths(now()->startOfMonth()) - 1;
            $y[$t] = $_->sum;
        }
        $y = array_reverse($y);

        if (count($x) < 2 || count($y) < 2) {
            return null;
        }
        while (count($y) > count($x)) {
            array_pop($y);
        }
        $lr    = linear_regression($x, $y);
        $pivot = $this->restrictSlope($lr, $y);

        $predictions = [];
        for ($i = 0; $i < $next; $i++) {
            $predictions[] = max(predict($i + 1, $lr) + $pivot, 0);
        }
        return [array_sum($predictions) * $wage, array_sum($y) * $wage];
    }
    public function predict($project, $next, $last, $wage) {
        $foci = Focus::select(DB::raw("DATE_FORMAT(started_at, '%Y-%m') AS month"), DB::raw('SUM(duration) AS sum'))
            ->groupBy('month')
            ->whereParent($project)
            ->where('started_at', '>', now()->subMonths($last)->startOf('month'))
            ->where('started_at', '<', now()->startOf('month'))
            ->get();
        return $this->predictFoci($foci->all(), $last, $next, $wage);
    }
    public function predictForCompany($company, $next, $last, $wage) {
        $dateRange = [now()->subMonths($last)->startOf('month'), now()->startOf('month')];
        $foci      = [
            ...$company->timeBasedFoci()->stats('foci.', 'foci.')->whereBetween('foci.started_at', $dateRange)->get()->all(),
            // ...$company->foci()->stats('foci.', 'foci.')->whereBetween('foci.started_at', $dateRange)->get()->all()
        ];
        return $this->predictFoci($foci, $last, $next, $wage);
    }
    public function restrictSlope(&$lr, $y) {
        $total     = array_sum($y);
        $pivot     = predict(count($y) - 1, $lr); // set pivot point of smoothed curve to last month
        $max_slope = self::MAX_SLOPE * $total / count($y);
        if ($lr['m'] > $max_slope) {
            $lr['m'] = $max_slope;
        }
        if ($lr['m'] < -$max_slope) {
            $lr['m'] = -$max_slope;
        }
        $lr['b'] = 0;   // pivot has been moved, so no offset is needed anymore
        return $pivot;
    }
}

function predict($month, $lr) {
    return $lr['b'] + $month * $lr['m'];
}

function linear_regression($x, $y) {
    // calculate number points
    $n = count($x);

    // ensure both arrays of points are the same size
    if ($n != count($y)) {
        trigger_error("linear_regression(): Number of elements in coordinate arrays do not match $n != ".count($y).'.', E_USER_ERROR);
    }

    // calculate sums
    $x_sum = array_sum($x);
    $y_sum = array_sum($y);

    $xx_sum = 0;
    $xy_sum = 0;

    for ($i = 0; $i < $n; $i++) {
        $xy_sum += ($x[$i] * $y[$i]);
        $xx_sum += ($x[$i] * $x[$i]);
    }

    // calculate slope
    $m = (($n * $xy_sum) - ($x_sum * $y_sum)) / (($n * $xx_sum) - ($x_sum * $x_sum));

    // calculate intercept
    $b = ($y_sum - ($m * $x_sum)) / $n;

    // return result
    return ['m' => $m, 'b' => $b];
}
