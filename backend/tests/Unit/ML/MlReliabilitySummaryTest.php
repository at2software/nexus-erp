<?php

namespace Tests\Unit\ML;

use App\ML\MlReliabilitySummary;
use Carbon\Carbon;
use PHPUnit\Framework\TestCase;

class MlReliabilitySummaryTest extends TestCase {
    public function test_regression_beats_baseline_with_strong_r2_is_high_bucket(): void {
        $evaluation = [
            'n'          => 2345,
            'baseline'   => ['mae' => 199.7, 'rmse' => 435.8, 'r2' => 0.02, 'smape' => 30.7],
            'estimators' => [
                'KNNRegressor' => ['mae' => 151.0, 'rmse' => 350.0, 'r2' => 0.37, 'smape' => 23.0],
            ],
        ];

        $summary = MlReliabilitySummary::forRegression($evaluation, 'KNNRegressor', 'historical mean gap', Carbon::parse('2026-07-01T12:00:00Z'));

        self::assertSame('KNNRegressor', $summary['estimator']);
        self::assertSame('MAE', $summary['primary_metric']);
        self::assertSame(151.0, $summary['value']);
        self::assertSame(0.37, $summary['r2']);
        self::assertTrue($summary['beats_baseline']);
        self::assertSame('historical mean gap', $summary['baseline_label']);
        self::assertSame(199.7, $summary['baseline_value']);
        self::assertSame(2345, $summary['n']);
        // R2 0.37 < 0.4 threshold -> moderate, not high, even though it beats baseline.
        self::assertSame('moderate', $summary['bucket']);
        self::assertSame('2026-07-01T12:00:00+00:00', $summary['trained_at']);
    }
    public function test_regression_high_bucket_requires_r2_at_least_0_4(): void {
        $evaluation = [
            'n'          => 500,
            'baseline'   => ['mae' => 100.0, 'rmse' => 200.0, 'r2' => 0.1, 'smape' => 40.0],
            'estimators' => [
                'GradientBoost' => ['mae' => 50.0, 'rmse' => 90.0, 'r2' => 0.55, 'smape' => 20.0],
            ],
        ];

        $summary = MlReliabilitySummary::forRegression($evaluation, 'GradientBoost', 'quote', Carbon::now());

        self::assertTrue($summary['beats_baseline']);
        self::assertSame('high', $summary['bucket']);
    }
    public function test_regression_not_beating_baseline_is_always_low_even_with_good_r2(): void {
        // Mirrors Model A (customer revenue): baseline wins on MAE despite
        // reasonable R2 on the model side — must not be oversold as "moderate"/"high".
        $evaluation = [
            'n'          => 2257,
            'baseline'   => ['mae' => 6300.0, 'rmse' => 16300.0, 'r2' => 0.52, 'smape' => 42.0],
            'estimators' => [
                'GradientBoost' => ['mae' => 6330.0, 'rmse' => 18800.0, 'r2' => 0.36, 'smape' => 54.0],
            ],
        ];

        $summary = MlReliabilitySummary::forRegression($evaluation, 'GradientBoost', 'trailing 12m revenue', Carbon::now());

        self::assertFalse($summary['beats_baseline']);
        self::assertSame('low', $summary['bucket']);
    }
    public function test_classification_beats_baseline_with_weak_mcc_is_moderate_bucket(): void {
        // Mirrors Model C (churn): does NOT beat baseline on F1 in production, but this
        // test exercises the "beats baseline" branch directly to verify moderate bucketing.
        $evaluation = [
            'n'          => 1992,
            'positives'  => 215,
            'baseline'   => ['accuracy' => 0.886, 'f1' => 0.30, 'macro_f1' => 0.6, 'mcc' => 0.2, 'precision' => 0.3, 'recall' => 0.3],
            'estimators' => [
                'GaussianNBUniform' => ['accuracy' => 0.828, 'f1' => 0.395, 'macro_f1' => 0.659, 'mcc' => 0.314, 'precision' => 0.318, 'recall' => 0.521],
            ],
        ];

        $summary = MlReliabilitySummary::forClassification($evaluation, 'GaussianNBUniform', 'recency > 365 days', Carbon::now());

        self::assertSame('GaussianNBUniform', $summary['estimator']);
        self::assertSame('F1', $summary['primary_metric']);
        self::assertSame(0.395, $summary['value']);
        self::assertTrue($summary['beats_baseline']);
        // MCC 0.314 < 0.4 threshold -> moderate.
        self::assertSame('moderate', $summary['bucket']);
    }
    public function test_classification_not_beating_baseline_is_low(): void {
        // The REAL production result for Model C: baseline F1 0.407 beats GaussianNB's 0.395.
        $evaluation = [
            'n'          => 1992,
            'positives'  => 215,
            'baseline'   => ['accuracy' => 0.886, 'f1' => 0.407, 'macro_f1' => 0.675, 'mcc' => 0.349, 'precision' => 0.464, 'recall' => 0.363],
            'estimators' => [
                'GaussianNBUniform' => ['accuracy' => 0.828, 'f1' => 0.395, 'macro_f1' => 0.659, 'mcc' => 0.314, 'precision' => 0.318, 'recall' => 0.521],
            ],
        ];

        $summary = MlReliabilitySummary::forClassification($evaluation, 'GaussianNBUniform', 'recency > 365 days', Carbon::now());

        self::assertFalse($summary['beats_baseline']);
        self::assertSame('low', $summary['bucket']);
    }
    public function test_classification_high_bucket_requires_beating_baseline_and_mcc_at_least_0_4(): void {
        $evaluation = [
            'n'          => 1000,
            'positives'  => 150,
            'baseline'   => ['accuracy' => 0.8, 'f1' => 0.3, 'macro_f1' => 0.6, 'mcc' => 0.2, 'precision' => 0.3, 'recall' => 0.3],
            'estimators' => [
                'RandomForestBalanced' => ['accuracy' => 0.9, 'f1' => 0.6, 'macro_f1' => 0.8, 'mcc' => 0.55, 'precision' => 0.6, 'recall' => 0.6],
            ],
        ];

        $summary = MlReliabilitySummary::forClassification($evaluation, 'RandomForestBalanced', 'recency > 365 days', Carbon::now());

        self::assertTrue($summary['beats_baseline']);
        self::assertSame('high', $summary['bucket']);
    }
}
