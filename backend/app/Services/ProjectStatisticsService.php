<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectState;
use Carbon\Carbon;

class ProjectStatisticsService {
    public static function getQuoteAccuracy(Carbon $start, Carbon $end): array {
        $q = Project::whereHas('states', fn ($q) => $q
            ->where('progress', ProjectState::Finished)
            ->where('is_successful', true)
        )
            ->whereRelation('states', 'project_project_state.created_at', '>', $start)
            ->whereRelation('states', 'project_project_state.created_at', '<', $end)
            ->where('net', '>', 0);

        $results      = $q->get();
        $data         = [];
        $SUBDIVISIONS = 2;
        foreach ($results as $r) {
            $range = floor($SUBDIVISIONS * log10($r->net));
            if (empty($data[$range])) {
                $data[$range] = ['net' => $range, 'values' => []];
            }
            if ($r->quote_accuracy > 0) {
                $data[$range]['values'][] = $r->quote_accuracy * 100;
            }
        }
        foreach ($data as &$d) {
            $d['stddev']  = self::stddev($d['values']);
            $d['min']     = min($d['values']);
            $d['max']     = max($d['values']);
            $d['average'] = array_sum($d['values']) / count($d['values']);
            unset($d['values']);
        }
        usort($data, fn ($a, $b): float|int => $a['net'] - $b['net']);
        return array_values($data);
    }
    protected static function stddev($arr) {
        $num_of_elements = count($arr);
        $variance        = 0.0;
        $average         = array_sum($arr) / $num_of_elements;
        foreach ($arr as $i) {
            $variance += pow(($i - $average), 2);
        }
        return (float)sqrt($variance / $num_of_elements);
    }
    public static function getLeadProbabilityByDuration($span = null): ?array {
        $projects = self::getBudgetBasedProjectsWithDesicionAndSpan($span);
        return self::computeLogisticRegressionData(
            $projects,
            fn ($_) => $_->created_at->diffInDays($_->desicion_at),
            fn ($_) => self::getProjectSuccessLabel($_)
        );
    }
    public static function getLeadProbabilityByBudget($span = null): ?array {
        $projects = self::getBudgetBasedProjectsWithDesicionAndSpan($span);
        return self::computeLogisticRegressionData(
            $projects,
            fn ($_) => intval($_->net),
            fn ($_) => self::getProjectSuccessLabel($_)
        );
    }
    protected static function getProjectSuccessLabel($project): int {
        $lastFinished = $project->lastFinishedState->first();

        if (! $lastFinished) {
            return 1;
        }
        return ($lastFinished->is_successful && $lastFinished->is_in_stats) ? 1 : 0;
    }
    protected static function getBudgetBasedProjectsWithDesicionAndSpan($span = null) {
        $builder = Project::whereBudgetBased()
            ->whereHas('states', fn ($q) => $q->where('progress', '>=', ProjectState::Running)->where('is_in_stats', true));
        if ($span) {
            $builder->whereAfter(now()->subYears($span));
        }
        return $builder->with('lastFinishedState')->get();
    }
    protected static function computeLogisticRegressionData($projects, $fnx, $fny, $capx = null, $capy = null): ?array {
        $samples = [];
        $labels  = [];

        foreach ($projects as $project) {
            $x = $fnx($project);
            $y = $fny($project);
            if ($capx && $x > $capx) {
                continue;
            }
            if ($capy && $y > $capy) {
                continue;
            }
            $samples[] = $x;
            $labels[]  = $y;
        }

        if (count($samples) < 10) {
            return null;
        }

        $maxDuration       = max($samples);
        $normalizedSamples = array_map(fn ($x) => $x / $maxDuration, $samples);

        $a            = 0.0;
        $b            = 0.0;
        $learningRate = 0.05;
        $epochs       = 5000;

        for ($epoch = 0; $epoch < $epochs; $epoch++) {
            $gradA = 0.0;
            $gradB = 0.0;
            $n     = count($normalizedSamples);

            for ($i = 0; $i < $n; $i++) {
                $x     = $normalizedSamples[$i];
                $y     = $labels[$i];
                $pred  = 1 / (1 + exp(-($a + $b * $x)));
                $error = $pred - $y;

                $gradA += $error;
                $gradB += $error * $x;
            }

            $a -= $learningRate * $gradA / $n;
            $b -= $learningRate * $gradB / $n;
        }

        $uniqueDurations = array_unique($samples);
        sort($uniqueDurations);

        $curve = [];

        foreach ($uniqueDurations as $duration) {
            $xNorm = $duration / $maxDuration;
            $p     = 1 / (1 + exp(-($a + $b * $xNorm)));

            $curve[] = [
                'x' => $duration,
                'y' => round($p, 4),
            ];
        }
        return $curve;
    }
}
