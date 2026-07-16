<?php

namespace App\ML;

use App\Models\Project;
use Carbon\Carbon;
use Illuminate\Support\Collection;

/**
 * Phase-2 history features: company / PM / product track record, computed
 * with strict temporal-leakage discipline — only from projects that had
 * already FINISHED before the target project's `decision_at` (the quote-time
 * cutoff; more accurate than `started_at` for "quote-time" leakage since
 * work can start after the quote is decided, and it has better coverage:
 * 877/885 vs 766/885 on the Phase-0 eligible set).
 */
class ProjectHistory {
    /**
     * @param Collection<int, Project> $pool eligible finished projects to search for prior matches
     * @param Collection<int, Project> $targets projects to compute history features for
     * @return array<int, array<string, mixed>> keyed by target project id
     */
    public static function compute(Collection $pool, Collection $targets): array {
        $rows = $pool->map(fn (Project $project) => [
            'id'                 => $project->id,
            'company_id'         => $project->company_id,
            'project_manager_id' => $project->project_manager_id,
            'product_id'         => $project->product_id,
            'finished_at'        => $project->finished_at,
            'quote_accuracy'     => $project->quote_accuracy,
        ]);

        $byCompany = $rows->groupBy('company_id');
        $byPm      = $rows->groupBy('project_manager_id');
        $byProduct = $rows->groupBy('product_id');

        $result = [];
        foreach ($targets as $project) {
            $cutoff  = $project->decision_at;
            $exclude = $project->id;

            $result[$project->id] = [
                'company_history_overrun' => self::average($byCompany->get($project->company_id, collect()), $cutoff, $exclude),
                'company_prior_count'     => self::count($byCompany->get($project->company_id, collect()), $cutoff, $exclude),
                'pm_history_overrun'      => $project->project_manager_id
                    ? self::average($byPm->get($project->project_manager_id, collect()), $cutoff, $exclude)
                    : null,
                'product_history_overrun' => $project->product_id
                    ? self::average($byProduct->get($project->product_id, collect()), $cutoff, $exclude)
                    : null,
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
            && $row['finished_at']
            && $row['finished_at']->lt($cutoff));
    }

    /** @param Collection<int, array<string, mixed>> $rows */
    private static function average(Collection $rows, ?Carbon $cutoff, int $excludeId): ?float {
        $accuracies = self::priorRows($rows, $cutoff, $excludeId)
            ->pluck('quote_accuracy')
            ->filter(fn ($value) => $value > 0);

        return $accuracies->isEmpty() ? null : $accuracies->avg();
    }

    /** @param Collection<int, array<string, mixed>> $rows */
    private static function count(Collection $rows, ?Carbon $cutoff, int $excludeId): int {
        return self::priorRows($rows, $cutoff, $excludeId)->count();
    }
}
