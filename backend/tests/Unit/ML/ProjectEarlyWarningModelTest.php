<?php

namespace Tests\Unit\ML;

use App\ML\ProjectCheckpointDataset;
use App\ML\ProjectEarlyWarningModel;
use PHPUnit\Framework\TestCase;

class ProjectEarlyWarningModelTest extends TestCase {
    private function row(array $overrides = []): array {
        return array_merge([
            'project_id'                    => 1,
            'work_estimated'                => 40.0,
            'hours_logged_so_far'           => 10.0,
            'elapsed_days'                  => 5.0,
            'burn_rate'                     => 2.0,
            'pct_of_quote_used'             => 0.25,
            'remaining_quote'               => 30.0,
            ProjectCheckpointDataset::LABEL => 25.0,
        ], $overrides);
    }
    public function test_to_sample_produces_fixed_order_vector(): void {
        self::assertSame(
            [40.0, 10.0, 5.0, 2.0, 0.25, 30.0],
            ProjectEarlyWarningModel::toSample($this->row())
        );
    }
    public function test_evaluate_baseline_uses_remaining_quote_as_the_naive_predictor(): void {
        $rows = [];
        foreach (range(1, 6) as $projectId) {
            $rows[] = $this->row([
                'project_id'                    => $projectId,
                'remaining_quote'               => 10.0 * $projectId,
                ProjectCheckpointDataset::LABEL => 10.0 * $projectId + 5.0, // baseline is always 5h short
            ]);
        }

        $result = ProjectEarlyWarningModel::evaluate($rows, folds: 3);

        self::assertEqualsWithDelta(5.0, $result['baseline']['mae'], 0.0001);
        self::assertSame(6, $result['n']);
        self::assertSame(6, $result['projects']);
    }
    public function test_evaluate_groups_checkpoints_by_project_not_by_row(): void {
        $rows = [];
        foreach (range(1, 8) as $projectId) {
            foreach ([0.25, 0.5, 0.75] as $fraction) {
                $rows[] = $this->row([
                    'project_id'                    => $projectId,
                    'pct_of_quote_used'             => $fraction,
                    ProjectCheckpointDataset::LABEL => 20.0 * (1 - $fraction),
                ]);
            }
        }
        self::assertCount(24, $rows);

        $result = ProjectEarlyWarningModel::evaluate($rows, folds: 4);

        // 24 rows from 8 distinct projects — grouping must recognize 8 groups, not 24.
        self::assertSame(24, $result['n']);
        self::assertSame(8, $result['projects']);
        self::assertSame(4, $result['k']);
    }
    public function test_evaluate_returns_positive_error_magnitudes_not_rubix_negated_scores(): void {
        $rows = [];
        foreach (range(1, 20) as $projectId) {
            $work   = 10.0 + $projectId;
            $rows[] = $this->row([
                'project_id'                    => $projectId,
                'work_estimated'                => $work,
                'remaining_quote'               => $work * 0.5,
                ProjectCheckpointDataset::LABEL => $work * 0.6,
            ]);
        }

        $result = ProjectEarlyWarningModel::evaluate($rows, folds: 4);

        foreach (array_merge([$result['baseline']], array_values($result['estimators'])) as $metrics) {
            self::assertGreaterThanOrEqual(0.0, $metrics['mae']);
            self::assertGreaterThanOrEqual(0.0, $metrics['rmse']);
            self::assertGreaterThanOrEqual(0.0, $metrics['smape']);
            self::assertLessThanOrEqual(1.0, $metrics['r2']);
        }
    }
}
