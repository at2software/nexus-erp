<?php

namespace App\Console\Commands\Cronjobs;

use App\Console\Commands\Concerns\PersistsMlReliability;
use App\Console\Commands\Concerns\PrintsFeatureDistributions;
use App\ML\SupportLoadDataset;
use App\ML\SupportLoadModel;
use Illuminate\Console\Command;

class TrainSupportLoadModel extends Command {
    use PersistsMlReliability;
    use PrintsFeatureDistributions;

    protected $signature   = 'ml:train-support-load {--dry-run : Validate data only, print distributions, train nothing}';
    protected $description = 'Train the support-load forecast: predicted customer support hours over the next quarter (Rubix ML)';

    public function handle(): int {
        $companies = SupportLoadDataset::eligibleCompanies();
        $this->info("Eligible customers: {$companies->count()}");

        if ($companies->isEmpty()) {
            $this->error('No eligible customers found — nothing to validate or train on.');
            return 1;
        }

        $rows = SupportLoadDataset::extractRows($companies);
        $this->info("Snapshot rows (company x cutoff): {$rows->count()}");

        if ($rows->isEmpty()) {
            $this->error('No snapshot rows could be built (not enough pre/post-cutoff support-focus history) — nothing to validate or train on.');
            return 1;
        }
        if ($rows->count() < 100) {
            $this->warn('Fewer than 100 snapshot rows: expect weak models. Proceeding for learning purposes, but report this honestly.');
        }

        $this->printDistribution('Label: support_hours_next_window', $rows->pluck(SupportLoadDataset::LABEL));
        $this->printDistribution(
            'Label: log(support_hours_next_window + 1)',
            $rows->pluck(SupportLoadDataset::LABEL)->map(fn ($hours) => SupportLoadDataset::logLabel($hours))
        );

        foreach (SupportLoadDataset::FEATURES as $feature) {
            $this->printDistribution("Feature: {$feature}", $rows->pluck($feature));
        }

        if ($this->option('dry-run')) {
            return 0;
        }

        $rowsArray  = $rows->all();
        $evaluation = SupportLoadModel::evaluate($rowsArray);
        $this->printEvaluation($evaluation);

        $bestName    = collect($evaluation['estimators'])->sortBy(fn ($m) => $m['mae'])->keys()->first();
        $bestMae     = $evaluation['estimators'][$bestName]['mae'];
        $baselineMae = $evaluation['baseline']['mae'];

        if ($bestMae < $baselineMae) {
            $this->info(sprintf('Best estimator: %s (MAE %.2f) beats the trailing-window-hours baseline (MAE %.2f).', $bestName, $bestMae, $baselineMae));
        } else {
            $this->warn(sprintf('Best estimator: %s (MAE %.2f) does NOT beat the trailing-window-hours baseline (MAE %.2f). Persisting anyway for iteration — do not present as more reliable than the baseline yet.', $bestName, $bestMae, $baselineMae));
        }

        $estimator = (SupportLoadModel::candidates()[$bestName])();
        SupportLoadModel::train($rowsArray, $estimator);
        $this->info("Trained {$bestName} on all {$evaluation['n']} snapshot rows and persisted to storage/app/ml/support_load.rbx.");

        $this->persistRegressionReliability('ML_RELIABILITY_SUPPORT_LOAD', $evaluation, $bestName, 'trailing window hours');

        return 0;
    }
    private function printEvaluation(array $evaluation): void {
        $this->line(sprintf(
            'Cross-validated on %d snapshot rows across %d companies, %d grouped folds (out-of-fold, hours):',
            $evaluation['n'],
            $evaluation['companies'],
            $evaluation['k']
        ));

        $headers = ['', 'MAE', 'RMSE', 'R2', 'SMAPE'];
        $rows    = [
            $this->metricRow('Baseline (= trailing window hours)', $evaluation['baseline']),
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
