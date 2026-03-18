<?php

namespace App\Console\Commands\Cronjobs;

use App\Http\Controllers\StatsController;
use App\Models\Project;
use App\Models\ProjectState;
use Illuminate\Console\Command;

class UpdateLeadProbability extends Command {
    protected $signature   = 'cron:update-lead-probability';
    protected $description = 'updates lead probability';

    public function handle() {
        // Train on all projects that reached a decision (any state with progress >= 1)
        // This includes: Running (1), Finished (2), Failed (2), Lead Failed (2), etc.
        // Excludes: Prepared (0), Quoted (0), Ignored (2 but is_in_stats=0)
        // y=1: Has finished state with is_successful=true AND is_in_stats=true
        // y=0: Still running (progress=1) OR failed (progress=2, is_successful=false)
        $projects = Project::whereBudgetBased()
            ->whereHas('states', fn ($q) => $q->where('progress', '>=', ProjectState::Running)->where('is_in_stats', true))
            ->with('lastFinishedState')
            ->get();

        $stats      = app(StatsController::class);
        $dataTime   = $stats->computeLogisticRegressionData($projects, ...$stats->fnShowLeadProbabilityByDuration());
        $dataBudget = $stats->computeLogisticRegressionData($projects, ...$stats->fnShowLeadProbabilityByBudget());

        $maxTime = array_reduce($dataTime, fn ($_, $point) => $point['y'] > $_ ? $point['y'] : $_, PHP_INT_MIN);
        if ($maxTime === 0) {
            return;
        }

        $projects           = Project::whereBudgetBased()->whereProgress(ProjectState::Prepared)->where('lead_probability', '>=', 0)->get();
        $totalExpectedValue = 0;

        foreach ($projects as $project) {
            $budgetProb = $this->findYBelowThreshold($dataBudget, $project->net);
            $timeProb   = $this->findYBelowThreshold($dataTime, $project->created_at->diffInDays(now()));

            $argumentation = [];
            $daysAge       = $project->created_at->diffInDays(now());

            // Handle cases where values are outside the training data range
            // Use the first (smallest) data point if value is below range
            if ($budgetProb === null && ! empty($dataBudget)) {
                $budgetProb      = $dataBudget[0]['y'];
                $argumentation[] = 'Budget ('.number_format($project->net, 2).') is below training data range, using minimum probability.';
            } else {
                $argumentation[] = 'Budget-based probability: '.round($budgetProb * 100, 1).'% (based on €'.number_format($project->net, 2).')';
            }

            if ($timeProb === null && ! empty($dataTime)) {
                $timeProb        = $dataTime[0]['y'];
                $argumentation[] = "Age ({$daysAge} days) is below training data range, using minimum probability.";
            } else {
                $argumentation[] = 'Time-based probability: '.round($timeProb * 100, 1)."% (based on {$daysAge} days old)";
            }

            // Skip if we still don't have valid probabilities (empty training data)
            if ($budgetProb === null || $timeProb === null) {
                $this->warn("Skipping project {$project->id}: insufficient training data (budgetProb={$budgetProb}, timeProb={$timeProb})");
                continue;
            }

            $timeMult        = $timeProb / $maxTime;   // need to adjust because base probability already comes from budget
            $probability     = $timeMult * $budgetProb;
            $argumentation[] = 'Time multiplier: '.round($timeMult * 100, 1).'% (adjusts for lead age)';
            $argumentation[] = 'Computed probability: '.round($probability * 100, 1).'%';

            // Apply manual multiplier if set
            $multiplier = $project->lead_probability_multiplier ?? 1.0;
            if ($multiplier != 1.0) {
                $argumentation[] = 'Manual multiplier: '.$multiplier.'x';
                $probability     = $probability * $multiplier;
                $argumentation[] = 'Final probability (after multiplier): '.round($probability * 100, 1).'%';
            } else {
                $argumentation[] = 'Final probability: '.round($probability * 100, 1).'%';
            }

            $argumentationText = implode("\n", $argumentation);

            $this->info("Updating lead probability for project \"{$project->name}\" to {$probability} (budgetProb: {$budgetProb}, timeProb: {$timeProb}, timeMult: {$timeMult}, multiplier: {$multiplier})");
            $project->update([
                'lead_probability'               => $probability,
                'lead_probability_argumentation' => $argumentationText,
            ]);

            $totalExpectedValue += $project->net * $probability;
        }

        $this->info('Total expected value (sum of net * lead_probability): '.number_format($totalExpectedValue, 2));
    }
    public function findYBelowThreshold(array $array, float $threshold): ?float {
        $low    = 0;
        $high   = count($array) - 1;
        $result = null;
        while ($low <= $high) {
            $mid = intdiv($low + $high, 2);
            $x   = $array[$mid]['x'];
            if ($x < $threshold) {
                $result = $array[$mid]['y'];
                $low    = $mid + 1;
            } else {
                $high = $mid - 1;
            }
        }
        return $result;
    }
}
