<?php

namespace Tests\Unit\ML;

use App\ML\CustomerIntervalDataset;
use App\ML\CustomerIntervalModel;
use PHPUnit\Framework\TestCase;

class CustomerIntervalModelTest extends TestCase {
    private function row(array $overrides = []): array {
        return array_merge([
            'company_id'                    => 1,
            'mean_gap_days'                 => 120.0,
            'median_gap_days'               => 110.0,
            'gap_stddev_days'               => 30.0,
            'purchase_count_to_date'        => 8,
            'days_since_last_purchase'      => 90,
            'tenure_days'                   => 900,
            'last_gap_days'                 => 100.0,
            CustomerIntervalDataset::LABEL  => 130.0,
        ], $overrides);
    }
    public function test_to_sample_produces_fixed_order_vector(): void {
        self::assertSame(
            [120.0, 110.0, 30.0, 8.0, 90.0, 900.0, 100.0],
            CustomerIntervalModel::toSample($this->row())
        );
    }
    public function test_to_sample_uses_nan_for_missing_gap_stats(): void {
        $sample = CustomerIntervalModel::toSample($this->row([
            'mean_gap_days'   => null,
            'median_gap_days' => null,
            'gap_stddev_days' => null,
        ]));
        self::assertNan($sample[0]);
        self::assertNan($sample[1]);
        self::assertNan($sample[2]);
    }
    public function test_evaluate_baseline_uses_historical_mean_gap_as_the_naive_predictor(): void {
        $rows = [];
        foreach (range(1, 6) as $companyId) {
            $rows[] = $this->row([
                'company_id'                   => $companyId,
                'mean_gap_days'                => 100.0 * $companyId,
                CustomerIntervalDataset::LABEL => 100.0 * $companyId + 15.0, // baseline always 15 days short
            ]);
        }

        $result = CustomerIntervalModel::evaluate($rows, folds: 3);

        self::assertEqualsWithDelta(15.0, $result['baseline']['mae'], 0.0001);
        self::assertSame(6, $result['n']);
        self::assertSame(6, $result['companies']);
    }
    public function test_evaluate_groups_snapshots_by_company_not_by_row(): void {
        $rows = [];
        foreach (range(1, 8) as $companyId) {
            foreach ([80.0, 120.0, 160.0] as $gap) {
                $rows[] = $this->row([
                    'company_id'                   => $companyId,
                    'mean_gap_days'                => $gap,
                    CustomerIntervalDataset::LABEL => $gap + 10.0,
                ]);
            }
        }
        self::assertCount(24, $rows);

        $result = CustomerIntervalModel::evaluate($rows, folds: 4);

        self::assertSame(24, $result['n']);
        self::assertSame(8, $result['companies']);
        self::assertSame(4, $result['k']);
    }
    public function test_evaluate_returns_positive_error_magnitudes_not_rubix_negated_scores(): void {
        $rows = [];
        foreach (range(1, 20) as $companyId) {
            $gap    = 60.0 + $companyId * 5;
            $rows[] = $this->row([
                'company_id'                   => $companyId,
                'mean_gap_days'                => $gap,
                CustomerIntervalDataset::LABEL => $gap * 1.1,
            ]);
        }

        $result = CustomerIntervalModel::evaluate($rows, folds: 4);

        foreach (array_merge([$result['baseline']], array_values($result['estimators'])) as $metrics) {
            self::assertGreaterThanOrEqual(0.0, $metrics['mae']);
            self::assertGreaterThanOrEqual(0.0, $metrics['rmse']);
            self::assertGreaterThanOrEqual(0.0, $metrics['smape']);
            self::assertLessThanOrEqual(1.0, $metrics['r2']);
        }
    }
}
