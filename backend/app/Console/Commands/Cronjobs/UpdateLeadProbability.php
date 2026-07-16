<?php

namespace App\Console\Commands\Cronjobs;

use App\ML\ProjectQuoteDataset;
use App\ML\ProjectQuoteHistory;
use App\ML\ProjectQuoteModel;
use App\Models\Project;
use Illuminate\Console\Command;

/**
 * Refreshes projects.lead_probability for open (Prepared) budget-based quotes
 * from the ML quote-acceptance model (App\ML\ProjectQuoteModel) — replaces
 * the previous two-factor budget/age logistic-regression heuristic (see git
 * history for the old implementation), which the ML model beats decisively
 * on cross-validated accepted-F1 (0.808 vs a 0.690 baseline — see
 * backend/docs/ml/project-quote-acceptance-plan.md).
 *
 * Must run before cron:cashflow / stats cronjobs, which consume
 * projects.lead_probability (see routes/console.php ordering — Laravel's
 * scheduler runs same-time-due commands in registration order).
 */
class UpdateLeadProbability extends Command {
    protected $signature   = 'cron:update-lead-probability';
    protected $description = 'Refresh projects.lead_probability for open (Prepared) budget-based quotes from the ML quote-acceptance model';

    public function handle(): int {
        if (! ProjectQuoteModel::load()) {
            $this->warn('No trained quote-acceptance model found — run ml:train-project-quote-acceptance first. Skipping.');
            return 0;
        }

        // Negative lead_probability is a manual "pin this down" override (see the
        // raw, un-abs()'d use of lead_probability in WidgetController's cashflow
        // sum) — those projects are deliberately excluded from auto-recompute,
        // same exclusion the previous heuristic already applied.
        $projects = Project::whereBudgetBased()
            ->wherePrepared()
            ->where('lead_probability', '>=', 0)
            ->with(['states', 'company', 'invoiceItemsRaw'])
            ->get();

        if ($projects->isEmpty()) {
            $this->info('No prepared projects to update.');
            return 0;
        }

        // Batched: one eligible-pool load, one history pass, one model call —
        // not N of each (see ProjectQuoteWhatIf for the same batching discipline).
        $pool    = ProjectQuoteDataset::eligibleProjects();
        $history = ProjectQuoteHistory::compute($pool, $projects);
        $rows    = $projects->map(fn (Project $p) => ProjectQuoteDataset::extractRow($p, $history[$p->id] ?? []))->values()->all();

        $probabilities = ProjectQuoteModel::probaForRows($rows);

        $this->info("Updating ML lead probability for {$projects->count()} prepared projects...");

        $totalExpectedValue = 0;
        foreach ($projects->values() as $i => $project) {
            $probability = $probabilities[$i] ?? null;
            if ($probability === null) {
                continue;
            }

            $multiplier = $project->lead_probability_multiplier ?? 1.0;
            $final      = $probability * $multiplier;

            $argumentation = 'ML-predicted acceptance probability (RandomForest quote-acceptance model): '.round($probability * 100, 1).'%';
            if ($multiplier != 1.0) {
                $argumentation .= "\nManual multiplier: {$multiplier}x\nFinal probability: ".round($final * 100, 1).'%';
            }

            $this->info("  \"{$project->name}\": ".round($final * 100, 1).'%');
            $project->update([
                'lead_probability'               => $final,
                'lead_probability_argumentation' => $argumentation,
            ]);

            $totalExpectedValue += $project->net * $final;
        }

        $this->info('Total expected value (sum of net * lead_probability): '.number_format($totalExpectedValue, 2));
        return 0;
    }
}
