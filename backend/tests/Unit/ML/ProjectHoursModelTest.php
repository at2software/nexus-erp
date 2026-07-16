<?php

namespace Tests\Unit\ML;

use App\ML\ProjectDataset;
use App\ML\ProjectHoursModel;
use PHPUnit\Framework\TestCase;
use Rubix\ML\Transformers\NumericStringConverter;

class ProjectHoursModelTest extends TestCase {
    private function row(array $overrides = []): array {
        return array_merge([
            'work_estimated'           => 40.0,
            'net'                      => 500.0,
            'hours_planned_sum'        => 20.0,
            'team_size'                => 2,
            'milestone_count'          => 2,
            'lead_probability'         => 0.6,
            'product_id'               => null,
            'estimated_duration_days'  => 2.5,
            ProjectDataset::LABEL      => 25.0,
        ], $overrides);
    }
    public function test_to_sample_produces_fixed_order_vector_with_missing_product_id(): void {
        self::assertSame(
            [40.0, 500.0, 20.0, 2.0, 2.0, 0.6, '?', 2.5],
            ProjectHoursModel::toSample($this->row())
        );
    }
    public function test_to_sample_prefixes_product_id_so_it_stays_categorical(): void {
        self::assertSame(
            [40.0, 500.0, 20.0, 2.0, 2.0, 0.6, 'product_85', 2.5],
            ProjectHoursModel::toSample($this->row(['product_id' => 85]))
        );
    }
    public function test_to_sample_uses_nan_for_missing_estimated_duration(): void {
        $sample = ProjectHoursModel::toSample($this->row(['estimated_duration_days' => null]));
        self::assertNan($sample[7]);
    }

    /**
     * Regression test: NumericStringConverter runs first in the pipeline and converts
     * numeric-looking strings back into floats. A bare "85" would survive on rows that
     * have a product_id while '?' stays a string on rows that don't, mixing types
     * within one column depending on fold composition (this crashed training
     * intermittently deep inside MissingDataImputer/ZScaleStandardizer). The
     * 'product_' prefix must make the value non-numeric so it's immune to this.
     */
    public function test_product_id_sample_value_survives_numeric_string_converter(): void {
        $samples = [
            ProjectHoursModel::toSample($this->row(['product_id' => 85])),
            ProjectHoursModel::toSample($this->row(['product_id' => null])),
        ];

        (new NumericStringConverter)->transform($samples);

        self::assertIsString($samples[0][6]);
        self::assertIsString($samples[1][6]);
        self::assertSame('product_85', $samples[0][6]);
        self::assertSame('?', $samples[1][6]);
    }

    public function test_evaluate_baseline_uses_work_estimated_as_the_naive_predictor(): void {
        $rows = [
            $this->row(['work_estimated' => 40.0, ProjectDataset::LABEL => 50.0, 'product_id' => 1]),
            $this->row(['work_estimated' => 10.0, ProjectDataset::LABEL => 10.0, 'product_id' => 2]),
            $this->row(['work_estimated' => 20.0, ProjectDataset::LABEL => 30.0, 'product_id' => 1]),
            $this->row(['work_estimated' => 60.0, ProjectDataset::LABEL => 40.0, 'product_id' => 2]),
        ];

        $result = ProjectHoursModel::evaluate($rows, folds: 2);

        // MAE = mean(|work_estimated - hours_invested|) = mean(10, 0, 10, 20) = 10
        self::assertEqualsWithDelta(10.0, $result['baseline']['mae'], 0.0001);
        self::assertSame(4, $result['n']);
        self::assertGreaterThanOrEqual(0.0, $result['baseline']['smape']);
    }
    public function test_evaluate_returns_positive_error_magnitudes_not_rubix_negated_scores(): void {
        $rows = array_fill(0, 20, null);
        foreach ($rows as $i => $_) {
            $work     = 10.0 + $i;
            $rows[$i] = $this->row([
                'work_estimated'      => $work,
                ProjectDataset::LABEL => $work + 5.0,
                'product_id'          => $i % 3 === 0 ? ($i % 2) + 1 : null,
            ]);
        }

        $result = ProjectHoursModel::evaluate($rows, folds: 4);

        foreach (array_merge([$result['baseline']], array_values($result['estimators'])) as $metrics) {
            self::assertGreaterThanOrEqual(0.0, $metrics['mae']);
            self::assertGreaterThanOrEqual(0.0, $metrics['rmse']);
            self::assertGreaterThanOrEqual(0.0, $metrics['smape']);
            self::assertLessThanOrEqual(1.0, $metrics['r2']);
        }
    }
}
