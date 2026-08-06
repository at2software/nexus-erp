<?php

namespace App\ML;

use App\Models\Project;
use Carbon\Carbon;
use Illuminate\Support\Collection;

/**
 * Leak-safe per-company acceptance-rate history, computed with strict
 * temporal-leakage discipline — only from OTHER projects of the same company
 * that were already decided (`decision_at`) strictly before the target
 * project's own `decision_at`. Mirrors ProjectHistory::compute() (Model 1's
 * company/PM/product overrun history) but tracks quote acceptance instead of
 * hours overrun.
 */
class ProjectQuoteHistory {
    /**
     * @param Collection<int, Project> $pool eligible decided projects to search for prior matches
     * @param Collection<int, Project> $targets projects to compute history features for
     * @return array<int, array<string, mixed>> keyed by target project id
     */
    public static function compute(Collection $pool, Collection $targets): array {
        $rows = $pool->map(fn (Project $project) => [
            'id'          => $project->id,
            'company_id'  => $project->company_id,
            'decision_at' => $project->decision_at,
            'accepted'    => ProjectQuoteDataset::isAccepted($project),
        ]);

        $byCompany = $rows->groupBy('company_id');

        // decision_at is a computed accessor (a live query per call, not a
        // real column) — $rows already paid for it once per pool project, so
        // reuse that instead of re-resolving it for the same project again
        // below (targets is usually === pool, e.g. extractRows()'s batch
        // path). Only a target that isn't also in the pool (the on-demand
        // single-project case) falls through to a fresh accessor call.
        $decisionAtById = $rows->pluck('decision_at', 'id');

        $result = [];
        foreach ($targets as $project) {
            $cutoff  = $decisionAtById->get($project->id, fn () => $project->decision_at) ?? Carbon::now();
            $exclude = $project->id;

            $prior = self::priorRows($byCompany->get($project->company_id, collect()), $cutoff, $exclude);

            $result[$project->id] = [
                'company_acceptance_rate'     => $prior->isEmpty() ? null : $prior->pluck('accepted')->avg(),
                'company_prior_decided_count' => $prior->count(),
                // Threaded through to ProjectQuoteDataset::daysPending() so it
                // doesn't re-resolve decision_at a 3rd time for the same project.
                'decision_cutoff'             => $cutoff,
            ];
        }
        return $result;
    }

    /** @param Collection<int, array<string, mixed>> $rows */
    private static function priorRows(Collection $rows, ?Carbon $cutoff, int $excludeId): Collection {
        if (! $cutoff) {
            return collect();
        }
        return $rows->filter(fn (array $row) => $row['id'] !== $excludeId
            && $row['decision_at']
            && $row['decision_at']->lt($cutoff));
    }
}
