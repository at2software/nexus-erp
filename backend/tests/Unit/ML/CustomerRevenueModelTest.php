<?php

namespace Tests\Unit\ML;

use App\ML\CustomerRevenueDataset;
use App\ML\CustomerRevenueModel;
use PHPUnit\Framework\TestCase;

class CustomerRevenueModelTest extends TestCase {
    private function row(array $overrides = []): array {
        return array_merge([
            'company_id'                     => 1,
            'trailing_6m_revenue'            => 2000.0,
            'trailing_12m_revenue'           => 4000.0,
            'trailing_24m_revenue'           => 7000.0,
            'lifetime_revenue_to_date'       => 20000.0,
            'invoice_count_to_date'          => 12,
            'invoice_count_trailing_12m'     => 3,
            'avg_invoice_net_lifetime'       => 1666.0,
            'tenure_days'                    => 1200,
            'days_since_last_invoice'        => 40,
            'distinct_product_count_to_date' => 4,
            'revenue_growth_ratio'           => 1.1,
            CustomerRevenueDataset::LABEL    => 4500.0,
        ], $overrides);
    }
    public function test_to_sample_produces_fixed_order_nine_column_vector(): void {
        // toSample deliberately reads only the 9 "Phase 1" columns, not
        // trailing_6m_revenue / revenue_growth_ratio (measured negative result).
        self::assertSame(
            [4000.0, 7000.0, 20000.0, 12.0, 3.0, 1666.0, 1200.0, 40.0, 4.0],
            CustomerRevenueModel::toSample($this->row())
        );
    }
    public function test_evaluate_baseline_uses_trailing_12m_revenue_as_the_naive_predictor(): void {
        $rows = [];
        foreach (range(1, 6) as $companyId) {
            $rows[] = $this->row([
                'company_id'                  => $companyId,
                'trailing_12m_revenue'        => 1000.0 * $companyId,
                CustomerRevenueDataset::LABEL => 1000.0 * $companyId + 200.0, // baseline is always 200 short
            ]);
        }

        $result = CustomerRevenueModel::evaluate($rows, folds: 3);

        self::assertEqualsWithDelta(200.0, $result['baseline']['mae'], 0.0001);
        self::assertSame(6, $result['n']);
        self::assertSame(6, $result['companies']);
    }
    public function test_evaluate_groups_snapshots_by_company_not_by_row(): void {
        $rows = [];
        foreach (range(1, 8) as $companyId) {
            foreach ([2000.0, 4000.0, 6000.0] as $revenue) {
                $rows[] = $this->row([
                    'company_id'                  => $companyId,
                    'trailing_12m_revenue'        => $revenue,
                    CustomerRevenueDataset::LABEL => $revenue * 1.1,
                ]);
            }
        }
        self::assertCount(24, $rows);

        $result = CustomerRevenueModel::evaluate($rows, folds: 4);

        // 24 rows from 8 distinct companies — grouping must recognize 8 groups, not 24.
        self::assertSame(24, $result['n']);
        self::assertSame(8, $result['companies']);
        self::assertSame(4, $result['k']);
    }
    public function test_evaluate_returns_positive_error_magnitudes_not_rubix_negated_scores(): void {
        $rows = [];
        foreach (range(1, 20) as $companyId) {
            $revenue = 1000.0 + $companyId * 100;
            $rows[]  = $this->row([
                'company_id'                  => $companyId,
                'trailing_12m_revenue'        => $revenue,
                CustomerRevenueDataset::LABEL => $revenue * 1.05,
            ]);
        }

        $result = CustomerRevenueModel::evaluate($rows, folds: 4);

        foreach (array_merge([$result['baseline']], array_values($result['estimators'])) as $metrics) {
            self::assertGreaterThanOrEqual(0.0, $metrics['mae']);
            self::assertGreaterThanOrEqual(0.0, $metrics['rmse']);
            self::assertGreaterThanOrEqual(0.0, $metrics['smape']);
            self::assertLessThanOrEqual(1.0, $metrics['r2']);
        }
    }
    public function test_log_label_is_monotonic_and_invertible(): void {
        self::assertEqualsWithDelta(0.0, CustomerRevenueDataset::logLabel(0.0), 0.0001);
        self::assertGreaterThan(CustomerRevenueDataset::logLabel(100.0), CustomerRevenueDataset::logLabel(1000.0));
        // Invert log(x+1): exp(y) - 1 == x
        self::assertEqualsWithDelta(4500.0, exp(CustomerRevenueDataset::logLabel(4500.0)) - 1, 0.01);
    }
}
