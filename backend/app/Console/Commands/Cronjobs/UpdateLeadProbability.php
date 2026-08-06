<?php

namespace App\Console\Commands\Cronjobs;

use App\ML\ProjectQuoteDataset;
use App\ML\ProjectQuoteHistory;
use App\ML\ProjectQuoteModel;
use App\Models\Project;
use Illuminate\Console\Command;

class UpdateLeadProbability extends Command {
    protected $signature   = 'cron:update-lead-probability';
    protected $description = 'Refresh projects.lead_probability for open (Prepared) budget-based quotes from the ML quote-acceptance model';

    public function handle(): int {
        if (! ProjectQuoteModel::load()) {
            $this->warn('No trained quote-acceptance model found — run ml:train-project-quote-acceptance first. Skipping.');
            return 0;
        }

        $projects = Project::whereBudgetBased()
            ->wherePrepared()
            ->where('lead_probability', '>=', 0)
            ->with(['states', 'company', 'invoiceItemsRaw'])
            ->get();

        if ($projects->isEmpty()) {
            $this->info('No prepared projects to update.');
            return 0;
        }

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
