<?php

namespace App\Services;

use App\Models\I18n;
use App\Models\LeadSource;
use App\Models\MarketingInitiative;
use App\Models\MarketingInitiativeActivity;
use App\Models\MarketingProspect;
use App\Models\MarketingProspectActivity;
use App\Models\MarketingWorkflow;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class MarketingDashboardService {
    public static function getDashboardStats(): array {
        $heatmapStart  = now()->subDays(3)->startOfDay();
        $heatmapEnd    = now()->addDays(6)->endOfDay();
        $thirtyDaysAgo = now()->subDays(30);

        $heatmap = MarketingProspectActivity::query()
            ->whereBetween('scheduled_at', [$heatmapStart, $heatmapEnd])
            ->selectRaw("
                DATE(scheduled_at) as date,
                COUNT(*) as total,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'pending'   THEN 1 ELSE 0 END) as pending
            ")
            ->groupByRaw('DATE(scheduled_at)')
            ->orderBy('date')
            ->get();

        $recentConversions = MarketingProspect::with([
            'marketingInitiative:id,name',
            'leadSource:id,name',
        ])
            ->where('status', 'converted')
            ->latest('updated_at')
            ->limit(8)
            ->get(['id', 'vcard', 'marketing_initiative_id', 'lead_source_id', 'updated_at'])
            ->map(fn ($p) => [
                'id'           => $p->id,
                'name'         => $p->vcard->getFirstValue('FN') ?? 'Unknown',
                'company'      => $p->vcard->getFirstValue('ORG'),
                'initiative'   => $p->marketingInitiative?->name,
                'source'       => $p->leadSource?->name,
                'converted_at' => $p->updated_at?->toDateString(),
            ]);

        $leadSources = LeadSource::withCount([
            'marketingProspects as total',
            'marketingProspects as converted' => fn ($q) => $q->where('status', 'converted'),
        ])
            ->orderByDesc('total')
            ->get(['id', 'name']);

        $aging = MarketingProspect::whereNotIn('status', ['converted', 'disqualified'])
            ->selectRaw('
                SUM(CASE WHEN DATEDIFF(NOW(), created_at) <= 7             THEN 1 ELSE 0 END) as fresh,
                SUM(CASE WHEN DATEDIFF(NOW(), created_at) BETWEEN 8 AND 30 THEN 1 ELSE 0 END) as warm,
                SUM(CASE WHEN DATEDIFF(NOW(), created_at) BETWEEN 31 AND 90 THEN 1 ELSE 0 END) as cooling,
                SUM(CASE WHEN DATEDIFF(NOW(), created_at) > 90             THEN 1 ELSE 0 END) as stale
            ')
            ->first();

        $userStats = MarketingProspectActivity::query()
            ->join('marketing_prospects as mp', 'mp.id', '=', 'marketing_prospect_activities.marketing_prospect_id')
            ->select('mp.user_id')
            ->selectRaw("
                SUM(CASE WHEN marketing_prospect_activities.status = 'completed' AND marketing_prospect_activities.completed_at >= ? THEN 1 ELSE 0 END) as completed_30d,
                SUM(CASE WHEN marketing_prospect_activities.status = 'pending'
                    AND marketing_prospect_activities.scheduled_at < NOW()
                    AND mp.status NOT IN ('unresponsive', 'disqualified', 'on_hold') THEN 1 ELSE 0 END) as overdue
            ", [$thirtyDaysAgo])
            ->groupBy('mp.user_id')
            ->orderByDesc('completed_30d')
            ->limit(6)
            ->get()
            ->keyBy('user_id');

        $teamUsers       = User::whereIn('id', $userStats->keys())->get()->keyBy('id');
        $teamPerformance = $userStats->map(fn ($stat) => [
            'id'            => $stat->user_id,
            'name'          => $teamUsers->get($stat->user_id)?->name ?? 'Unknown',
            'completed_30d' => (int)$stat->completed_30d,
            'overdue'       => (int)$stat->overdue,
        ])->values();

        $topInitiatives = MarketingInitiative::withCount([
            'prospects as total_prospects',
            'prospects as converted' => fn ($q) => $q->where('status', 'converted'),
        ])
            ->orderByDesc('converted')
            ->limit(6)
            ->get(['id', 'name', 'status'])
            ->map(function ($i) {
                $i->conversion_rate = $i->total_prospects > 0
                    ? round(($i->converted / $i->total_prospects) * 100, 1)
                    : 0;
                return $i;
            });

        $workflowEffectiveness = MarketingWorkflow::select('id', 'name', 'is_active')
            ->withCount([
                'prospectActivities as total_activities',
                'prospectActivities as completed_activities' => fn ($q) => $q->where('status', 'completed'),
            ])
            ->selectRaw('(
                SELECT COUNT(DISTINCT mp2.id)
                FROM marketing_initiative_activities mia2
                JOIN marketing_prospect_activities mpa2 ON mpa2.marketing_initiative_activity_id = mia2.id
                JOIN marketing_prospects mp2 ON mp2.id = mpa2.marketing_prospect_id
                WHERE mia2.marketing_workflow_id = marketing_workflows.id
            ) as total_workflow_prospects')
            ->selectRaw('(
                SELECT COUNT(DISTINCT mp2.id)
                FROM marketing_initiative_activities mia2
                JOIN marketing_prospect_activities mpa2 ON mpa2.marketing_initiative_activity_id = mia2.id
                JOIN marketing_prospects mp2 ON mp2.id = mpa2.marketing_prospect_id
                WHERE mia2.marketing_workflow_id = marketing_workflows.id
                AND mp2.status = \'converted\'
            ) as converted_prospects')
            ->having('total_activities', '>', 0)
            ->orderByDesc('completed_activities')
            ->limit(6)
            ->get()
            ->map(function ($w) {
                $w->completion_rate = $w->total_activities > 0
                    ? round(($w->completed_activities / $w->total_activities) * 100, 1)
                    : 0;
                $w->prospect_conversion_rate = $w->total_workflow_prospects > 0
                    ? round(($w->converted_prospects / $w->total_workflow_prospects) * 100, 1)
                    : 0;
                return $w;
            });

        return [
            'heatmap'                => $heatmap,
            'recent_conversions'     => $recentConversions,
            'lead_sources'           => $leadSources,
            'aging'                  => $aging,
            'team_performance'       => $teamPerformance,
            'top_initiatives'        => $topInitiatives,
            'workflow_effectiveness' => $workflowEffectiveness,
        ];
    }
    public static function getOverdueActivitiesForAddon(int $userId, ?int $leadSourceId, ?int $initiativeId, bool $countOnly = false): mixed {
        $prospectsWithOverdueTasks = DB::table('marketing_prospect_activities as mpa')
            ->join('marketing_prospects as mp', 'mp.id', '=', 'mpa.marketing_prospect_id')
            ->select('mp.id')
            ->where('mp.user_id', $userId)
            ->whereNotIn('mp.status', ['unresponsive', 'disqualified'])
            ->where('mpa.status', 'pending')
            ->where('mpa.scheduled_at', '<=', today()->endOfDay())
            ->when($leadSourceId, fn ($q) => $q->where('mp.lead_source_id', $leadSourceId))
            ->when($initiativeId, fn ($q) => $q->where('mp.marketing_initiative_id', $initiativeId))
            ->distinct()
            ->pluck('id');

        $oldestActivityIds = DB::table('marketing_prospect_activities as mpa')
            ->select('mpa.id', 'mpa.marketing_prospect_id')
            ->whereIn('mpa.marketing_prospect_id', $prospectsWithOverdueTasks)
            ->where('mpa.status', 'pending')
            ->get()
            ->groupBy('marketing_prospect_id')
            ->map(fn ($activities) => $activities->sortBy('id')->first()->id)
            ->values();

        if ($countOnly) {
            return ['count' => $oldestActivityIds->count()];
        }

        $activities = MarketingProspectActivity::with([
            'marketingProspect' => fn ($q) => $q->select(['id', 'vcard', 'notes', 'user_id', 'lead_source_id', 'marketing_initiative_id', 'status', 'created_at', 'company_contact_id'])
                ->withMax('completedActivities as last_completed_activity', 'completed_at')
                ->with('leadSource:id,name')
                ->with('companyContact.contact'),
            'marketingInitiativeActivity' => fn ($q) => $q->select(['id', 'name', 'description', 'has_external_dependency', 'parent_activity_id', 'quick_action']),
        ])
            ->whereIn('id', $oldestActivityIds)
            ->orderBy('scheduled_at')
            ->get();

        $prospectIds     = $activities->pluck('marketing_prospect_id')->unique();
        $allPendingTasks = MarketingProspectActivity::with([
            'marketingProspect' => fn ($q) => $q->select(['id', 'vcard', 'notes', 'lead_source_id', 'created_at', 'company_contact_id'])
                ->withMax('completedActivities as last_completed_activity', 'completed_at')
                ->with('leadSource:id,name')
                ->with('companyContact.contact'),
            'marketingInitiativeActivity' => fn ($q) => $q->select(['id', 'name', 'description', 'has_external_dependency', 'parent_activity_id', 'quick_action']),
        ])
            ->whereIn('marketing_prospect_id', $prospectIds)
            ->where('status', 'pending')
            ->whereNotIn('id', $oldestActivityIds)
            ->orderBy('scheduled_at')
            ->get();

        $succeedingTasksMap = $allPendingTasks->each(fn ($task) => $task->is_overdue = $task->scheduled_at->lte(today()))
            ->groupBy('marketing_prospect_id');

        $activities->each(function ($activity) use ($succeedingTasksMap) {
            $activity->succeeding_tasks = $succeedingTasksMap->get($activity->marketing_prospect_id, collect())->values();
        });

        $expandI18n = function ($activity) {
            if ($activity->marketingInitiativeActivity && $activity->marketingInitiativeActivity->description === '@@i18n') {
                $i18nRecords = I18n::where([
                    'parent_type' => MarketingInitiativeActivity::class,
                    'parent_id'   => $activity->marketingInitiativeActivity->id,
                ])->get();

                if ($i18nRecords->isNotEmpty()) {
                    $activity->marketingInitiativeActivity->setAttribute('description', $i18nRecords->map(fn ($record) => [
                        'language'  => $record->language,
                        'formality' => $record->formality,
                        'text'      => $record->text,
                    ])->toArray());
                }
            }
        };

        $activities->each(function ($activity) use ($expandI18n) {
            $expandI18n($activity);
            $activity->succeeding_tasks?->each($expandI18n);
        });

        return $activities;
    }
}
