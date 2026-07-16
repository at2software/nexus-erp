<?php

namespace App\Console\Commands\Cronjobs;

use App\Console\Commands\Concerns\PersistsMlReliability;
use App\Console\Commands\Concerns\PrintsFeatureDistributions;
use App\ML\ProjectCheckpointDataset;
use App\ML\ProjectEarlyWarningModel;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;

class TrainProjectEarlyWarningModel extends Command {
    use PersistsMlReliability;
    use PrintsFeatureDistributions;

    protected $signature   = 'ml:train-project-early-warning {--dry-run : Validate data only, print distributions, train nothing}';
    protected $description = 'Train the early-warning regression model (Model 2, Rubix ML) on checkpoints synthesized from finished projects';

    public function handle(): int {
        $projects = ProjectCheckpointDataset::eligibleProjects();
        $this->info('Eligible finished projects (started_at known, span >= '.ProjectCheckpointDataset::MIN_DURATION_DAYS." days): {$projects->count()}");

        if ($projects->isEmpty()) {
            $this->error('No eligible projects found — nothing to validate or train on.');
            return 1;
        }

        $rows = ProjectCheckpointDataset::checkpointRows($projects);
        $this->info(count($rows).' checkpoint rows ('.count(ProjectCheckpointDataset::CHECKPOINT_FRACTIONS).' per project).');

        if ($projects->count() < 100) {
            $this->warn('Fewer than 100 eligible projects: expect weak models. Proceeding for learning purposes, but report this honestly.');
        }

        $collection = new Collection($rows);
        $this->printDistribution('Label: remaining_hours', $collection->pluck(ProjectCheckpointDataset::LABEL));
        foreach (ProjectCheckpointDataset::FEATURES as $feature) {
            $this->printDistribution("Feature: {$feature}", $collection->pluck($feature));
        }

        if ($this->option('dry-run')) {
            return 0;
        }

        $evaluation = ProjectEarlyWarningModel::evaluate($rows);
        $this->printEvaluation($evaluation);

        $bestName    = collect($evaluation['estimators'])->sortBy(fn ($m) => $m['mae'])->keys()->first();
        $bestMae     = $evaluation['estimators'][$bestName]['mae'];
        $baselineMae = $evaluation['baseline']['mae'];

        if ($bestMae < $baselineMae) {
            $this->info(sprintf('Best estimator: %s (MAE %.2f) beats the "trust remaining quote" baseline (MAE %.2f).', $bestName, $bestMae, $baselineMae));
        } else {
            $this->warn(sprintf('Best estimator: %s (MAE %.2f) does NOT beat the baseline (MAE %.2f). Persisting anyway for iteration — do not use for alerts yet.', $bestName, $bestMae, $baselineMae));
        }

        $estimator = (ProjectEarlyWarningModel::candidates()[$bestName])();
        ProjectEarlyWarningModel::train($rows, $estimator);
        $this->info("Trained {$bestName} on all ".count($rows).' checkpoints and persisted to storage/app/ml/project_early_warning.rbx.');

        $this->persistRegressionReliability('ML_RELIABILITY_PROJECT_OVERRUN', $evaluation, $bestName, 'remaining quote');

        return 0;
    }
    private function printEvaluation(array $evaluation): void {
        $this->line(sprintf(
            'Grouped cross-validation on %d checkpoints from %d projects, %d folds (out-of-fold, raw hours):',
            $evaluation['n'],
            $evaluation['projects'],
            $evaluation['k']
        ));

        $headers = ['', 'MAE', 'RMSE', 'R2', 'SMAPE'];
        $rows    = [
            $this->metricRow('Baseline (= remaining quote)', $evaluation['baseline']),
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
