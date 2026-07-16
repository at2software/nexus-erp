<?php

namespace App\ML;

use App\Models\Param;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * Feature extraction for the quote-accuracy models — the single source of
 * truth shared between training (TrainProjectHoursModel) and inference
 * (ProjectHoursModel::predict()).
 */
class ProjectDataset {
    /** Feature names, in extraction order. */
    public const FEATURES = [
        'work_estimated',
        'net',
        'hours_planned_sum',
        'team_size',
        'milestone_count',
        'lead_probability',
        'product_id',
        'estimated_duration_days',
        'company_history_overrun',
        'company_prior_count',
        'pm_history_overrun',
        'product_history_overrun',
    ];

    public const LABEL = 'hours_invested';

    /**
     * Finished, budget-based projects with a real quote. `hours_invested`
     * is computed (foci sum), so it's filtered in PHP after loading rather
     * than in SQL.
     */
    public static function eligibleQuery(): Builder {
        return Project::onlyFinished()
            ->whereBudgetBased()
            ->where('work_estimated', '>', 0)
            ->with(['hoursInvestedSum', 'milestones', 'assignees']);
    }

    public static function eligibleProjects(): Collection {
        return static::eligibleQuery()->get()
            ->filter(fn (Project $project) => $project->hours_invested > 0)
            ->values();
    }

    /**
     * One project's Phase-1 features, plus its Phase-2 history features if
     * $history is supplied (see ProjectHistory::compute()) — omitted history
     * keys simply come out null/0, which downstream (ProjectHoursModel) treats
     * as missing data, not as "no overrun"/"zero prior projects".
     *
     * @return array<string, mixed> feature values keyed by ProjectDataset::FEATURES, plus the label
     */
    public static function extractRow(Project $project, array $history = []): array {
        // assignees() includes customer/company contacts (assignee_type=CompanyContact),
        // not just the internal team actually doing the work — team_size/hours_planned_sum
        // must be restricted to User assignees or "team size" is inflated by client contacts.
        $workers  = $project->assignees->filter(fn ($assignment) => $assignment->assignee_type === User::class);
        $teamSize = $workers->count();

        return [
            'work_estimated'          => (float)$project->work_estimated,
            'net'                     => (float)($project->net ?? 0),
            'hours_planned_sum'       => (float)$workers->sum('hours_planned'),
            'team_size'               => $teamSize,
            'milestone_count'         => $project->milestones->count(),
            'lead_probability'        => (float)$project->lead_probability,
            'product_id'              => $project->product_id,
            // Parallelism-adjusted duration estimate from the quote itself: the quote's
            // units (hours/days) are already fully folded into work_estimated (see
            // InvoiceItem::assumedWorkload()), so this isn't a new base signal — dividing
            // by team_size is what makes it one, capturing "quoted for a lot of hours but
            // with a big team = shorter calendar time" that work_estimated alone can't.
            'estimated_duration_days' => $teamSize > 0 ? (float)$project->work_estimated / (self::hoursPerDay() * $teamSize) : null,
            'company_history_overrun' => $history['company_history_overrun'] ?? null,
            'company_prior_count'     => $history['company_prior_count'] ?? 0,
            'pm_history_overrun'      => $history['pm_history_overrun'] ?? null,
            'product_history_overrun' => $history['product_history_overrun'] ?? null,
            self::LABEL               => (float)$project->hours_invested,
        ];
    }

    /**
     * extractRow() for a whole collection, with leak-safe Phase-2 history
     * features computed once across the set (see ProjectHistory).
     *
     * @param Collection<int, Project> $projects
     * @return Collection<int, array<string, mixed>>
     */
    public static function extractRows(Collection $projects): Collection {
        $history = ProjectHistory::compute($projects, $projects);

        return $projects->map(fn (Project $project) => self::extractRow($project, $history[$project->id] ?? []));
    }

    /** Right-skewed hours → log-transform for the regression target. */
    public static function logLabel(float $hoursInvested): float {
        return log($hoursInvested + 1);
    }

    /** Hours-per-day config used to convert day-denominated quote units to hours. */
    private static function hoursPerDay(): float {
        return (float)(Param::get('INVOICE_HPD')->value ?? 8);
    }
}
