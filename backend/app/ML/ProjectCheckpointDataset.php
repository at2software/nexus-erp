<?php

namespace App\ML;

use App\Models\Project;
use Carbon\Carbon;
use Illuminate\Support\Collection;

/**
 * Feature extraction for Model 2 (early-warning): predicts REMAINING hours
 * for a RUNNING project from progress-so-far (burn rate), not quote-time
 * features alone. Different leakage boundary than ProjectDataset/Model 1:
 * training rows are synthesized as "checkpoints" partway through each
 * FINISHED project's own timeline, using only foci that happened at or
 * before the checkpoint — so the model never sees data from "the future"
 * relative to its own prediction point, matching what a real running
 * project looks like today.
 */
class ProjectCheckpointDataset {
    public const FEATURES = [
        'work_estimated',
        'hours_logged_so_far',
        'elapsed_days',
        'burn_rate',
        'pct_of_quote_used',
        'remaining_quote',
    ];
    public const LABEL = 'remaining_hours';

    /** Checkpoint fractions of a finished project's own started_at → finished_at span. */
    public const CHECKPOINT_FRACTIONS = [0.25, 0.5, 0.75];

    /** Projects too short-lived for a meaningful "partway through" checkpoint. */
    public const MIN_DURATION_DAYS = 5;

    /** Finished, quote-eligible projects with a known, non-trivial start→finish span. */
    public static function eligibleProjects(): Collection {
        return ProjectDataset::eligibleProjects()
            ->filter(fn (Project $project) => $project->started_at && $project->finished_at)
            ->filter(fn (Project $project) => $project->started_at->diffInDays($project->finished_at) >= self::MIN_DURATION_DAYS)
            ->values()
            ->load('foci:id,parent_id,parent_type,started_at,duration');
    }

    /**
     * One row per (project, checkpoint fraction). `project_id` is kept so
     * callers can group by project for cross-validation — checkpoints of the
     * same project are correlated, not independent samples, and must never
     * be split across train/test folds.
     *
     * @param Collection<int, Project> $projects
     * @return list<array<string, mixed>>
     */
    public static function checkpointRows(Collection $projects): array {
        $rows = [];
        foreach ($projects as $project) {
            $foci = $project->foci
                ->filter(fn ($focus) => $focus->started_at !== null)
                ->sortBy('started_at');

            $totalHours  = (float)$project->hours_invested;
            $spanSeconds = $project->started_at->diffInSeconds($project->finished_at);

            foreach (self::CHECKPOINT_FRACTIONS as $fraction) {
                $checkpointAt = $project->started_at->copy()->addSeconds((int)($fraction * $spanSeconds));

                $hoursSoFar = (float)$foci
                    ->filter(fn ($focus) => $focus->started_at->lte($checkpointAt))
                    ->sum('duration');

                $rows[] = self::row($project, $checkpointAt, $hoursSoFar, $totalHours - $hoursSoFar);
            }
        }
        return $rows;
    }

    /**
     * A running project's CURRENT checkpoint (no fraction needed — "now" is
     * the checkpoint). Same feature shape as checkpointRows(), just anchored
     * at now() instead of a synthetic fraction of a known, already-elapsed
     * span. No label, since the final hours aren't known yet.
     */
    public static function currentRow(Project $project): ?array {
        if (! $project->started_at) {
            return null;
        }

        $foci = $project->foci()->get(['started_at', 'duration'])
            ->filter(fn ($focus) => $focus->started_at !== null);

        $hoursSoFar = (float)$foci->sum('duration');

        return self::row($project, now(), $hoursSoFar, null);
    }

    private static function row(Project $project, Carbon $checkpointAt, float $hoursSoFar, ?float $remainingHours): array {
        $elapsedDays   = max($project->started_at->diffInDays($checkpointAt, true), 1 / 24);
        $workEstimated = (float)$project->work_estimated;

        $row = [
            'project_id'          => $project->id,
            'work_estimated'      => $workEstimated,
            'hours_logged_so_far' => $hoursSoFar,
            'elapsed_days'        => $elapsedDays,
            'burn_rate'           => $hoursSoFar / $elapsedDays,
            'pct_of_quote_used'   => $workEstimated > 0 ? $hoursSoFar / $workEstimated : 0.0,
            'remaining_quote'     => $workEstimated - $hoursSoFar,
        ];
        if ($remainingHours !== null) {
            $row[self::LABEL] = max(0.0, $remainingHours);
        }
        return $row;
    }

    /** Right-skewed hours → log-transform for the regression target. */
    public static function logLabel(float $remainingHours): float {
        return log($remainingHours + 1);
    }
}
