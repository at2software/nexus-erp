<?php

namespace App\Console\Commands\Cronjobs;

use App\Console\Commands\Concerns\PersistsMlReliability;
use App\Console\Commands\Concerns\PrintsFeatureDistributions;
use App\ML\CustomerChurnDataset;
use App\ML\CustomerChurnModel;
use Illuminate\Console\Command;

class TrainCustomerChurnModel extends Command {
    use PersistsMlReliability;
    use PrintsFeatureDistributions;

    protected $signature   = 'ml:train-customer-churn {--dry-run : Validate data only, print distributions + class balance, train nothing}';
    protected $description = 'Train Model C: the customer churn classifier (no purchase in the next 12 months) (Rubix ML)';

    public function handle(): int {
        $companies = CustomerChurnDataset::eligibleCompanies();
        $this->info("Eligible customers: {$companies->count()}");

        if ($companies->isEmpty()) {
            $this->error('No eligible customers found — nothing to validate or train on.');
            return 1;
        }

        $rows = CustomerChurnDataset::extractRows($companies);
        $this->info("Snapshot rows (company x cutoff): {$rows->count()}");

        if ($rows->isEmpty()) {
            $this->error('No snapshot rows could be built — nothing to validate or train on.');
            return 1;
        }
        if ($rows->count() < 100) {
            $this->warn('Fewer than 100 snapshot rows: expect weak models. Proceeding for learning purposes, but report this honestly.');
        }

        $positives = $rows->where(CustomerChurnDataset::LABEL, 1)->count();
        $rate      = $rows->count() > 0 ? $positives / $rows->count() : 0;
        $this->line(sprintf('Class balance: churned=%d (%.1f%%), retained=%d (%.1f%%)', $positives, $rate * 100, $rows->count() - $positives, (1 - $rate) * 100));

        foreach (CustomerChurnDataset::FEATURES as $feature) {
            $this->printDistribution("Feature: {$feature}", $rows->pluck($feature));
        }

        if ($this->option('dry-run')) {
            return 0;
        }

        $rowsArray  = $rows->all();
        $evaluation = CustomerChurnModel::evaluate($rowsArray);
        $this->printEvaluation($evaluation);

        $bestName   = collect($evaluation['estimators'])->sortByDesc(fn ($m) => $m['f1'])->keys()->first();
        $bestF1     = $evaluation['estimators'][$bestName]['f1'];
        $baselineF1 = $evaluation['baseline']['f1'];

        if ($bestF1 > $baselineF1) {
            $this->info(sprintf('Best estimator: %s (churned-F1 %.3f) beats the recency baseline (churned-F1 %.3f).', $bestName, $bestF1, $baselineF1));
        } else {
            $this->warn(sprintf('Best estimator: %s (churned-F1 %.3f) does NOT beat the recency baseline (churned-F1 %.3f). Persisting anyway for iteration — do not present as more reliable than the baseline yet.', $bestName, $bestF1, $baselineF1));
        }

        $estimator = (CustomerChurnModel::candidates()[$bestName])();
        CustomerChurnModel::train($rowsArray, $estimator);
        $this->info("Trained {$bestName} on all {$evaluation['n']} snapshot rows and persisted to storage/app/ml/customer_churn.rbx.");

        $this->persistClassificationReliability('ML_RELIABILITY_CUSTOMER_CHURN', $evaluation, $bestName, 'recency > 365 days');

        return 0;
    }
    private function printEvaluation(array $evaluation): void {
        $this->line(sprintf(
            'Cross-validated on %d snapshot rows across %d companies, %d grouped folds. Positive (churned) rate: %.1f%% (%d rows).',
            $evaluation['n'],
            $evaluation['companies'],
            $evaluation['k'],
            $evaluation['positive_rate'] * 100,
            $evaluation['positives']
        ));

        $headers = ['', 'Accuracy', 'churned-F1', 'macro-F1', 'MCC', 'Precision', 'Recall'];
        $rows    = [
            $this->metricRow('Baseline (recency > 365d)', $evaluation['baseline']),
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
