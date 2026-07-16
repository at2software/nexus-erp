<?php

namespace App\Console\Commands\Cronjobs;

use App\Console\Commands\Concerns\PersistsMlReliability;
use App\Console\Commands\Concerns\PrintsFeatureDistributions;
use App\ML\CustomerIntervalDataset;
use App\ML\CustomerIntervalModel;
use Illuminate\Console\Command;

class TrainCustomerIntervalModel extends Command {
    use PersistsMlReliability;
    use PrintsFeatureDistributions;

    protected $signature   = 'ml:train-customer-interval {--dry-run : Validate data only, print distributions, train nothing}';
    protected $description = 'Train Model B: the re-purchase interval ("when to contact again") regression (Rubix ML)';

    public function handle(): int {
        $companies = CustomerIntervalDataset::eligibleCompanies();
        $this->info("Eligible customers: {$companies->count()}");

        if ($companies->isEmpty()) {
            $this->error('No eligible customers found — nothing to validate or train on.');
            return 1;
        }

        $rows = CustomerIntervalDataset::extractRows($companies);
        $this->info("Snapshot rows (company x cutoff): {$rows->count()}");

        if ($rows->isEmpty()) {
            $this->error('No snapshot rows could be built (not enough prior purchases / no observable next purchase) — nothing to validate or train on.');
            return 1;
        }
        if ($rows->count() < 100) {
            $this->warn('Fewer than 100 snapshot rows: expect weak models. Proceeding for learning purposes, but report this honestly.');
        }

        $this->printDistribution('Label: next_gap_days', $rows->pluck(CustomerIntervalDataset::LABEL));
        $this->printDistribution(
            'Label: log(next_gap_days + 1)',
            $rows->pluck(CustomerIntervalDataset::LABEL)->map(fn ($days) => CustomerIntervalDataset::logLabel($days))
        );

        foreach (CustomerIntervalDataset::FEATURES as $feature) {
            $this->printDistribution("Feature: {$feature}", $rows->pluck($feature));
        }

        if ($this->option('dry-run')) {
            return 0;
        }

        $rowsArray  = $rows->all();
        $evaluation = CustomerIntervalModel::evaluate($rowsArray);
        $this->printEvaluation($evaluation);

        $bestName    = collect($evaluation['estimators'])->sortBy(fn ($m) => $m['mae'])->keys()->first();
        $bestMae     = $evaluation['estimators'][$bestName]['mae'];
        $baselineMae = $evaluation['baseline']['mae'];

        if ($bestMae < $baselineMae) {
            $this->info(sprintf('Best estimator: %s (MAE %.2f days) beats the historical-mean-gap baseline (MAE %.2f days).', $bestName, $bestMae, $baselineMae));
        } else {
            $this->warn(sprintf('Best estimator: %s (MAE %.2f days) does NOT beat the historical-mean-gap baseline (MAE %.2f days). Persisting anyway for iteration — do not present as more reliable than the baseline yet.', $bestName, $bestMae, $baselineMae));
        }

        $estimator = (CustomerIntervalModel::candidates()[$bestName])();
        CustomerIntervalModel::train($rowsArray, $estimator);
        $this->info("Trained {$bestName} on all {$evaluation['n']} snapshot rows and persisted to storage/app/ml/customer_interval.rbx.");

        $this->persistRegressionReliability('ML_RELIABILITY_CUSTOMER_INTERVAL', $evaluation, $bestName, 'historical mean gap');

        return 0;
    }
    private function printEvaluation(array $evaluation): void {
        $this->line(sprintf(
            'Cross-validated on %d snapshot rows across %d companies, %d grouped folds (out-of-fold, raw days):',
            $evaluation['n'],
            $evaluation['companies'],
            $evaluation['k']
        ));

        $headers = ['', 'MAE', 'RMSE', 'R2', 'SMAPE'];
        $rows    = [
            $this->metricRow('Baseline (= historical mean gap)', $evaluation['baseline']),
        ];
        foreach ($evaluation['estimators'] as $name => $metrics) {
            $rows[] = $this->metricRow($name, $metrics);
        }

        $this->table($headers, $rows);
    }
    private function metricRow(string $label, array $metrics): array {
        return [
            $label,
            number_format($metrics['mae'], 2),
            number_format($metrics['rmse'], 2),
            number_format($metrics['r2'], 3),
            number_format($metrics['smape'], 2),
        ];
    }
}
