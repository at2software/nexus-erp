<?php

namespace App\Traits;

use App\Models\Param;

/**
 * Global payment plan tiers are stored in PROJECT_PAYMENT_PLAN_TIERS as JSON:
 * [
 *   { "label": "small",  "threshold": 10000, "steps": [...] },
 *   { "label": "medium", "threshold": 50000, "steps": [...] },
 *   { "label": "large",  "threshold": null,  "steps": [...] }  // null = no upper limit
 * ]
 * Tiers must be ordered ascending by threshold; the last tier should have threshold: null.
 *
 * Project-specific plan is stored in PROJECT_PAYMENT_PLAN as a JSON array of steps:
 * [ { "percentage": 30, "trigger": "project_start" }, ... ]
 */
trait HasPaymentPlanTrait {
    public function getEffectivePaymentPlan(): array {
        $projectSpecific = $this->param('PROJECT_PAYMENT_PLAN', false)->value;
        $steps = $projectSpecific
            ? $this->parsePlanSteps($projectSpecific)
            : ($this->getMatchingTier()['steps'] ?? []);

        return $this->sortPlanSteps($steps);
    }

    public function getEffectiveTierLabel(): ?string {
        if ($this->param('PROJECT_PAYMENT_PLAN', false)->value) {
            return null; // project-specific, no tier applies
        }
        return $this->getMatchingTier()['label'] ?? null;
    }

    public function hasProjectSpecificPaymentPlan(): bool {
        return (bool) $this->param('PROJECT_PAYMENT_PLAN', false)->value;
    }

    public function getMatchingTier(): ?array {
        $tiersJson = Param::get('PROJECT_PAYMENT_PLAN_TIERS')?->value;
        if (! $tiersJson) return null;

        $tiers = is_string($tiersJson) ? json_decode($tiersJson, true) : null;
        if (! is_array($tiers) || empty($tiers)) return null;

        $net = $this->net ?? 0;
        foreach ($tiers as $tier) {
            $threshold = $tier['threshold'] ?? null;
            if ($threshold === null || $net < $threshold) {
                return $tier;
            }
        }
        return end($tiers) ?: null;
    }

    private function sortPlanSteps(array $steps): array {
        $order = ['project_start' => 0, 'monthly' => 1, 'feature_complete' => 2, 'acceptance' => 3];
        usort($steps, fn($a, $b) => ($order[$a['trigger'] ?? ''] ?? 99) <=> ($order[$b['trigger'] ?? ''] ?? 99));
        return $steps;
    }

    private function parsePlanSteps(mixed $value): array {
        if (! $value) return [];
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            return is_array($decoded) ? $decoded : [];
        }
        return [];
    }
}
