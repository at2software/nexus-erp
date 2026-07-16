<?php

namespace App\Console\Commands\Cronjobs;

use App\Console\Commands\Concerns\PersistsMlReliability;
use App\Console\Commands\Concerns\PrintsFeatureDistributions;
use App\ML\ProjectDataset;
use App\ML\ProjectHoursModel;
use Illuminate\Console\Command;

class TrainProjectHoursModel extends Command {
    use PersistsMlReliability;
    use PrintsFeatureDistributions;

    protected $signature   = 'ml:train-project-hours {--dry-run : Validate data only, print distributions, train nothing}';
    protected $description = 'Train the quote-accuracy regression model (Rubix ML) on finished projects';

    public function handle(): int {
        $projects = ProjectDataset::eligibleProjects();
        $this->info("Eligible finished projects: {$projects->count()}");

        if ($projects->isEmpty()) {
            $this->error('No eligible projects found — nothing to validate or train on.');
            return 1;
        }
        if ($projects->count() < 100) {
            $this->warn('Fewer than 100 eligible projects: expect weak models. Proceeding for learning purposes, but report this honestly.');
        }

        $rows = ProjectDataset::extractRows($projects);

        $this->printDistribution('Label: hours_invested', $rows->pluck(ProjectDataset::LABEL));
        $this->printDistribution(
            'Label: log(hours_invested + 1)',
            $rows->pluck(ProjectDataset::LABEL)->map(fn ($hours) => ProjectDataset::logLabel($hours))
        );

        foreach (ProjectDataset::FEATURES as $feature) {
            $this->printDistribution("Feature: {$feature}", $rows->pluck($feature));
        }

        if ($this->option('dry-run')) {
            return 0;
        }

        $rowsArray  = $rows->all();
        $evaluation = ProjectHoursModel::evaluate($rowsArray);
        $this->printEvaluation($evaluation);

        $bestName    = collect($evaluation['estimators'])->sortBy(fn ($m) => $m['mae'])->keys()->first();
        $bestMae     = $evaluation['estimators'][$bestName]['mae'];
        $baselineMae = $evaluation['baseline']['mae'];

        if ($bestMae < $baselineMae) {
            $this->info(sprintf('Best estimator: %s (MAE %.2f) beats the quote baseline (MAE %.2f).', $bestName, $bestMae, $baselineMae));
        } else {
            $this->warn(sprintf('Best estimator: %s (MAE %.2f) does NOT beat the quote baseline (MAE %.2f). Persisting anyway for iteration — do not use for alerts yet.', $bestName, $bestMae, $baselineMae));
        }

        $estimator = (ProjectHoursModel::candidates()[$bestName])();
        ProjectHoursModel::train($rowsArray, $estimator);
        $this->info("Trained {$bestName} on all {$evaluation['n']} projects and persisted to storage/app/ml/project_hours.rbx.");

        $this->persistRegressionReliability('ML_RELIABILITY_PROJECT_HOURS', $evaluation, $bestName, 'quoted work_estimated');

        return 0;
    }
    private function printEvaluation(array $evaluation): void {
        $this->line(sprintf('Cross-validated on %d projects, %d folds (out-of-fold, raw hours):', $evaluation['n'], $evaluation['k']));

        $headers = ['', 'MAE', 'RMSE', 'R2', 'SMAPE'];
        $rows    = [
            $this->metricRow('Baseline (= work_estimated)', $evaluation['baseline']),
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
