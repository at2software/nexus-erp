<?php

namespace Tests\Unit\ML;

use App\ML\CustomerChurnDataset;
use App\ML\CustomerChurnModel;
use PHPUnit\Framework\TestCase;

class CustomerChurnModelTest extends TestCase {
    private function row(array $overrides = []): array {
        return array_merge([
            'company_id'                    => 1,
            'days_since_last_purchase'      => 90,
            'mean_gap_days'                 => 120.0,
            'median_gap_days'               => 110.0,
            'gap_stddev_days'               => 30.0,
            'last_gap_days'                 => 100.0,
            'purchase_count_to_date'        => 8,
            'purchase_count_trailing_12m'   => 3,
            'tenure_days'                   => 900,
            'recency_over_mean_gap'         => 0.75,
            CustomerChurnDataset::LABEL     => 0,
        ], $overrides);
    }
    public function test_to_sample_produces_fixed_order_vector(): void {
        self::assertSame(
            [90.0, 120.0, 110.0, 30.0, 100.0, 8.0, 3.0, 900.0, 0.75],
            CustomerChurnModel::toSample($this->row())
        );
    }
    public function test_to_sample_uses_nan_for_missing_gap_stats(): void {
        $sample = CustomerChurnModel::toSample($this->row([
            'mean_gap_days'         => null,
            'median_gap_days'       => null,
            'gap_stddev_days'       => null,
            'recency_over_mean_gap' => null,
        ]));
        self::assertNan($sample[1]);
        self::assertNan($sample[2]);
        self::assertNan($sample[3]);
        self::assertNan($sample[8]);
    }
    public function test_label_is_a_string_for_the_rubix_classifier(): void {
        self::assertSame('1', CustomerChurnModel::label($this->row([CustomerChurnDataset::LABEL => 1])));
        self::assertSame('0', CustomerChurnModel::label($this->row([CustomerChurnDataset::LABEL => 0])));
    }
    public function test_evaluate_reports_class_balance_and_groups_by_company(): void {
        $rows = [];
        // 8 companies, 3 snapshots each; ~1/4 of rows are churned (label 1).
        foreach (range(1, 8) as $companyId) {
            foreach ([0, 1, 2] as $k) {
                $churned = ($companyId % 4 === 0) ? 1 : 0;
                $rows[]  = $this->row([
                    'company_id'                => $companyId,
                    'days_since_last_purchase'  => $churned ? 800 : 40,
                    'recency_over_mean_gap'     => $churned ? 6.0 : 0.4,
                    CustomerChurnDataset::LABEL => $churned,
                ]);
            }
        }
        self::assertCount(24, $rows);

        $result = CustomerChurnModel::evaluate($rows, folds: 4);

        self::assertSame(24, $result['n']);
        self::assertSame(8, $result['companies']);
        self::assertSame(4, $result['k']);
        self::assertSame(6, $result['positives']); // 2 of 8 companies churned x 3 rows
        self::assertEqualsWithDelta(0.25, $result['positive_rate'], 0.0001);
    }
    public function test_evaluate_baseline_predicts_churn_when_silent_over_365_days(): void {
        $rows = [];
        foreach (range(1, 10) as $companyId) {
            // Silent > 365d AND actually churned → baseline gets it right.
            $rows[] = $this->row([
                'company_id'                => $companyId,
                'days_since_last_purchase'  => 800,
                CustomerChurnDataset::LABEL => 1,
            ]);
            // Recent AND retained → baseline gets it right.
            $rows[] = $this->row([
                'company_id'                => $companyId,
                'days_since_last_purchase'  => 30,
                CustomerChurnDataset::LABEL => 0,
            ]);
        }

        $result = CustomerChurnModel::evaluate($rows, folds: 5);

        // A perfectly-separable recency baseline should score accuracy 1.0 here.
        self::assertEqualsWithDelta(1.0, $result['baseline']['accuracy'], 0.0001);
        self::assertEqualsWithDelta(1.0, $result['baseline']['recall'], 0.0001);
        self::assertEqualsWithDelta(1.0, $result['baseline']['precision'], 0.0001);
    }
    public function test_evaluate_metrics_are_in_zero_to_one_range(): void {
        $rows = [];
        foreach (range(1, 12) as $companyId) {
            foreach ([0, 1] as $k) {
                $churned = ($companyId + $k) % 3 === 0 ? 1 : 0;
                $rows[]  = $this->row([
                    'company_id'                => $companyId,
                    'days_since_last_purchase'  => $churned ? 600 : 50,
                    CustomerChurnDataset::LABEL => $churned,
                ]);
            }
        }

        $result = CustomerChurnModel::evaluate($rows, folds: 4);

        foreach (array_merge([$result['baseline']], array_values($result['estimators'])) as $metrics) {
            self::assertGreaterThanOrEqual(0.0, $metrics['accuracy']);
            self::assertLessThanOrEqual(1.0, $metrics['accuracy']);
            self::assertGreaterThanOrEqual(0.0, $metrics['f1']);
            self::assertLessThanOrEqual(1.0, $metrics['f1']);
            self::assertGreaterThanOrEqual(0.0, $metrics['precision']);
            self::assertLessThanOrEqual(1.0, $metrics['recall']);
        }
    }
}
