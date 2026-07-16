<?php

namespace App\Console\Commands\Concerns;

use App\ML\MlReliabilitySummary;
use App\Models\Param;

/**
 * Persists a winning estimator's cross-validated reliability summary as a GLOBAL
 * JSON param, so the frontend can render an honest "how much should I trust this
 * value" tooltip (see frontend `MlReliabilityDirective` / `[mlReliability]`).
 *
 * Reuses the `evaluate()` result each `ml:train-*` command already computes —
 * never recomputes metrics. Payload shape/bucketing logic lives in
 * `App\ML\MlReliabilitySummary` (pure, unit-tested); this trait is just the
 * thin DB-writing wrapper around it, mixed into the five `ml:train-*` commands.
 */
trait PersistsMlReliability {
    /**
     * @param array{n: int, estimators: array<string, array<string, float>>, baseline: array<string, float>} $evaluation the exact evaluate() result
     */
    private function persistRegressionReliability(string $paramKey, array $evaluation, string $bestName, string $baselineLabel): void {
        $this->saveReliabilityParam($paramKey, MlReliabilitySummary::forRegression($evaluation, $bestName, $baselineLabel));
    }

    /**
     * @param array{n: int, estimators: array<string, array<string, float>>, baseline: array<string, float>} $evaluation the exact evaluate() result
     */
    private function persistClassificationReliability(string $paramKey, array $evaluation, string $bestName, string $baselineLabel): void {
        $this->saveReliabilityParam($paramKey, MlReliabilitySummary::forClassification($evaluation, $bestName, $baselineLabel));
    }

    private function saveReliabilityParam(string $paramKey, array $payload): void {
        $param        = Param::get($paramKey);
        $param->value = json_encode($payload);
        $param->save();
        $this->info("Persisted reliability summary to global param {$paramKey}.");
    }
}
