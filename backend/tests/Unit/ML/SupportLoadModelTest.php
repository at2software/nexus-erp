<?php

namespace Tests\Unit\ML;

use App\ML\SupportLoadDataset;
use App\ML\SupportLoadModel;
use PHPUnit\Framework\TestCase;

class SupportLoadModelTest extends TestCase {
    private function row(array $overrides = []): array {
        return array_merge([
            'company_id'                          => 1,
            'trailing_3m_support_hours'           => 10.0,
            'trailing_6m_support_hours'           => 18.0,
            'trailing_12m_support_hours'          => 32.0,
            'lifetime_support_hours'              => 120.0,
            'support_ticket_count_trailing_12m'   => 8,
            'active_project_count_at_cutoff'      => 2,
            'trailing_12m_revenue'                => 15000.0,
            'tenure_days'                         => 900,
            'days_since_last_support'             => 12,
            'accepts_support'                     => 1.0,
            SupportLoadDataset::LABEL             => 11.0,
        ], $overrides);
    }
    public function test_to_sample_produces_fixed_order_ten_column_vector(): void {
        self::assertSame(
            [10.0, 18.0, 32.0, 120.0, 8.0, 2.0, 15000.0, 900.0, 12.0, 1.0],
            SupportLoadModel::toSample($this->row())
        );
    }
    public function test_evaluate_baseline_uses_trailing_window_hours_as_the_naive_predictor(): void {
        $rows = [];
        foreach (range(1, 6) as $companyId) {
            $rows[] = $this->row([
                'company_id'                 => $companyId,
                'trailing_3m_support_hours'  => 10.0 * $companyId,
                SupportLoadDataset::LABEL    => 10.0 * $companyId + 3.0, // baseline is always 3 short
            ]);
        }

        $result = SupportLoadModel::evaluate($rows, folds: 3);

        self::assertEqualsWithDelta(3.0, $result['baseline']['mae'], 0.0001);
        self::assertSame(6, $result['n']);
        self::assertSame(6, $result['companies']);
    }
    public function test_evaluate_groups_snapshots_by_company_not_by_row(): void {
        $rows = [];
        foreach (range(1, 8) as $companyId) {
            foreach ([5.0, 10.0, 15.0] as $hours) {
                $rows[] = $this->row([
                    'company_id'                => $companyId,
                    'trailing_3m_support_hours' => $hours,
                    SupportLoadDataset::LABEL   => $hours * 1.1,
                ]);
            }
        }
        self::assertCount(24, $rows);

        $result = SupportLoadModel::evaluate($rows, folds: 4);

        self::assertSame(24, $result['n']);
        self::assertSame(8, $result['companies']);
        self::assertSame(4, $result['k']);
    }
    public function test_evaluate_returns_positive_error_magnitudes_not_rubix_negated_scores(): void {
        $rows = [];
        foreach (range(1, 20) as $companyId) {
            $hours  = 5.0 + $companyId;
            $rows[] = $this->row([
                'company_id'                 => $companyId,
                'trailing_3m_support_hours'  => $hours,
                SupportLoadDataset::LABEL    => $hours * 1.05,
            ]);
        }

        $result = SupportLoadModel::evaluate($rows, folds: 4);

        foreach (array_merge([$result['baseline']], array_values($result['estimators'])) as $metrics) {
            self::assertGreaterThanOrEqual(0.0, $metrics['mae']);
            self::assertGreaterThanOrEqual(0.0, $metrics['rmse']);
            self::assertGreaterThanOrEqual(0.0, $metrics['smape']);
            self::assertLessThanOrEqual(1.0, $metrics['r2']);
        }
    }
    public function test_log_label_is_monotonic_and_invertible(): void {
        self::assertEqualsWithDelta(0.0, SupportLoadDataset::logLabel(0.0), 0.0001);
        self::assertGreaterThan(SupportLoadDataset::logLabel(5.0), SupportLoadDataset::logLabel(50.0));
        self::assertEqualsWithDelta(11.0, exp(SupportLoadDataset::logLabel(11.0)) - 1, 0.01);
    }
}
