<?php

namespace App\Console\Commands\Cronjobs;

use App\Console\Commands\Concerns\PersistsMlReliability;
use App\Console\Commands\Concerns\PrintsFeatureDistributions;
use App\ML\ProjectQuoteDataset;
use App\ML\ProjectQuoteModel;
use Illuminate\Console\Command;

class TrainProjectQuoteModel extends Command {
    use PersistsMlReliability;
    use PrintsFeatureDistributions;

    protected $signature   = 'ml:train-project-quote-acceptance {--dry-run : Validate data only, print distributions + class balance, train nothing}';
    protected $description = 'Train the project quote-acceptance classifier (Rubix ML)';

    public function handle(): int {
        $projects = ProjectQuoteDataset::eligibleProjects();
        $this->info("Eligible decided quotes: {$projects->count()}");

        if ($projects->isEmpty()) {
            $this->error('No eligible quotes found — nothing to validate or train on.');
            return 1;
        }

        $rows = ProjectQuoteDataset::extractRows($projects);

        if ($rows->count() < 100) {
            $this->warn('Fewer than 100 rows: expect weak models. Proceeding for learning purposes, but report this honestly.');
        }

        $positives = $rows->where(ProjectQuoteDataset::LABEL, 1)->count();
        $rate      = $rows->count() > 0 ? $positives / $rows->count() : 0;
        $this->line(sprintf('Class balance: accepted=%d (%.1f%%), rejected=%d (%.1f%%)', $positives, $rate * 100, $rows->count() - $positives, (1 - $rate) * 100));

        foreach (ProjectQuoteDataset::FEATURES as $feature) {
            $this->printDistribution("Feature: {$feature}", $rows->pluck($feature));
        }

        if ($this->option('dry-run')) {
            return 0;
        }

        $rowsArray  = $rows->values()->all();
        $evaluation = ProjectQuoteModel::evaluate($rowsArray);
        $this->printEvaluation($evaluation);

        // Headline metric = accepted-class F1.
        $bestName   = collect($evaluation['estimators'])->sortByDesc(fn ($m) => $m['f1'])->keys()->first();
        $bestF1     = $evaluation['estimators'][$bestName]['f1'];
        $baselineF1 = $evaluation['baseline']['f1'];

        if ($bestF1 > $baselineF1) {
            $this->info(sprintf('Best estimator: %s (accepted-F1 %.3f) beats the company-persistence baseline (accepted-F1 %.3f).', $bestName, $bestF1, $baselineF1));
        } else {
            $this->warn(sprintf('Best estimator: %s (accepted-F1 %.3f) does NOT beat the company-persistence baseline (accepted-F1 %.3f). Persisting anyway for iteration — do not present as more reliable than the baseline yet.', $bestName, $bestF1, $baselineF1));
        }

        $estimator = (ProjectQuoteModel::candidates()[$bestName])();
        ProjectQuoteModel::train($rowsArray, $estimator);
        $this->info("Trained {$bestName} on all {$evaluation['n']} rows and persisted to storage/app/ml/project_quote_acceptance.rbx.");

        $this->persistClassificationReliability('ML_RELIABILITY_PROJECT_QUOTE_ACCEPTANCE', $evaluation, $bestName, 'company persistence (>50%)');

        return 0;
    }
    private function printEvaluation(array $evaluation): void {
        $this->line(sprintf(
            'Cross-validated on %d rows across %d companies, %d grouped folds. Positive (accepted) rate: %.1f%% (%d rows).',
            $evaluation['n'],
            $evaluation['companies'],
            $evaluation['k'],
            $evaluation['positive_rate'] * 100,
            $evaluation['positives']
        ));

        $headers = ['', 'Accuracy', 'accepted-F1', 'macro-F1', 'MCC', 'Precision', 'Recall'];
        $rows    = [
            $this->metricRow('Baseline (company persistence)', $evaluation['baseline']),
        ];
        foreach ($evaluation['estimators'] as $name => $metrics) {
            $rows[] = $this->metricRow($name, $metrics);
        }

        $this->table($headers, $rows);
    }
    private function metricRow(string $label, array $metrics): array {
        return [
            $label,
            number_format($metrics['accuracy'], 3),
            number_format($metrics['f1'], 3),
            number_format($metrics['macro_f1'], 3),
            number_format($metrics['mcc'], 3),
            number_format($metrics['precision'], 3),
            number_format($metrics['recall'], 3),
        ];
    }
}
