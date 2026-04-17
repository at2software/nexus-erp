<?php

namespace App\Http\Controllers;

use App\Models\I18n;
use App\Models\LeadSource;
use App\Models\MarketingActivity;
use App\Models\MarketingInitiative;
use App\Models\MarketingInitiativeActivity;
use App\Models\MarketingPerformanceMetric;
use App\Models\MarketingProspect;
use App\Models\MarketingProspectActivity;
use App\Models\MarketingWorkflow;
use App\Models\Project;
use App\Models\User;
use App\Services\MarketingFunnelService;
use App\Services\MarketingMetricsService;
use App\Services\MarketingRemarketingService;
use App\Services\MarketingWorkflowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MarketingController extends Controller {
    // ===== Private Helpers =====

    private function assertBelongsTo($child, string $foreignKey, int $parentId, string $message, int $status = 422): ?JsonResponse {
        return $parentId !== $child->$foreignKey
            ? response()->json(['error' => $message], $status)
            : null;
    }
    private function activityUpdateRules(string $parentTable): array {
        return [
            'name'                    => 'string|max:255',
            'day_offset'              => 'integer|min:1',
            'description'             => 'nullable',
            'description.*.language'  => 'sometimes|string|max:10',
            'description.*.formality' => 'sometimes|string|max:20',
            'description.*.text'      => 'sometimes|string',
            'description.language'    => 'sometimes|string|max:10',
            'description.formality'   => 'sometimes|string|max:20',
            'description.text'        => 'sometimes|string',
            'is_required'             => 'boolean',
            'has_external_dependency' => 'boolean',
            'parent_activity_id'      => "nullable|exists:{$parentTable},id",
            'quick_action'            => 'nullable|in:EMAIL,LINKEDIN,LINKEDIN_SEARCH,CALL',
        ];
    }
    private function metricAttachRules(): array {
        return [
            'metric_id'    => 'required|exists:marketing_performance_metrics,id',
            'target_value' => 'nullable|numeric|min:0',
        ];
    }
    private function prospectActivityStatusRules(): array {
        return [
            'status'            => 'required|in:completed,skipped,failed,pending,overdue',
            'notes'             => 'nullable|string',
            'performance_value' => 'nullable|numeric',
        ];
    }
    private function applyActivityStatusUpdate(MarketingProspectActivity $activity, MarketingProspect $prospect, array $validated): bool {
        if ($validated['status'] === 'completed') {
            return (bool)$prospect->markActivityCompleted(
                $activity->id,
                $validated['notes'] ?? null,
                $validated['performance_value'] ?? null
            );
        }
        return $activity->update([
            'status' => $validated['status'],
            'notes'  => $validated['notes'] ?? null,
        ]);
    }

    // ===== Public Methods =====

    public function getFunnelChart(Request $request) {
        $query = Project::whereBudgetBased();
        MarketingFunnelService::applyRequestFilters($query, $request);
        return MarketingFunnelService::getFunnelChart($query);
    }
    public function getRemarketing() {
        return MarketingRemarketingService::getRemarketingData();
    }
    public function getRemarketingDue() {
        return MarketingRemarketingService::getRemarketingDue();
    }

    // ===== Marketing Automation Methods =====

    // Addon Authentication
    public function showUserForAddon(Request $request) {
        $user = $request->user();
        return [
            'id'    => $user->id,
            'name'  => $user->name,
            'email' => $user->email,
        ];
    }

    // Performance Metrics (KPIs)
    public function indexPerformanceMetrics(Request $request) {
        return MarketingMetricsService::getPerformanceMetrics($request);
    }
    public function showPerformanceMetric(MarketingPerformanceMetric $marketingPerformanceMetric) {
        return $marketingPerformanceMetric->load([
            'marketingInitiatives' => fn ($q) => $q->select(['id', 'name', 'status']),
            'marketingActivities.marketingWorkflow',
        ]);
    }
    public function storePerformanceMetric(Request $request) {
        $validated = $request->validate([
            'name'         => 'required|string|max:255',
            'description'  => 'nullable|string',
            'metric_type'  => 'required|in:counter,percentage,conversion,currency,duration',
            'target_value' => 'nullable|numeric|min:0',
        ]);

        $metric = MarketingPerformanceMetric::create($validated);
        return $metric;
    }
    public function updatePerformanceMetric(Request $request, MarketingPerformanceMetric $marketingPerformanceMetric) {
        $validated = $request->validate([
            'name'         => 'string|max:255',
            'description'  => 'nullable|string',
            'metric_type'  => 'in:counter,percentage,conversion,currency,duration',
            'target_value' => 'nullable|numeric|min:0',
        ]);

        $marketingPerformanceMetric->update($validated);
        return $marketingPerformanceMetric;
    }
    public function destroyPerformanceMetric(MarketingPerformanceMetric $marketingPerformanceMetric) {
        $marketingPerformanceMetric->delete();
        return response()->json(['message' => 'Performance metric deleted successfully']);
    }

    // Initiative <-> Metric Management
    public function indexInitiativeMetrics(MarketingInitiative $marketingInitiative) {
        return $marketingInitiative->performanceMetrics()
            ->withPivot(['target_value'])
            ->get();
    }
    public function attachInitiativeMetric(Request $request, MarketingInitiative $marketingInitiative) {
        $validated = $request->validate($this->metricAttachRules());

        $result = MarketingMetricsService::attachMetricToInitiative(
            $marketingInitiative,
            $validated['metric_id'],
            $validated['target_value'] ?? null
        );

        if ($result === null) {
            return response()->json(['error' => 'Metric already attached to this initiative'], 409);
        }
        return $result;
    }
    public function updateInitiativeMetric(Request $request, MarketingInitiative $marketingInitiative, MarketingPerformanceMetric $marketingPerformanceMetric) {
        $validated = $request->validate([
            'target_value' => 'nullable|numeric|min:0',
        ]);
        return MarketingMetricsService::updateInitiativeMetric(
            $marketingInitiative,
            $marketingPerformanceMetric,
            $validated['target_value'] ?? null
        );
    }
    public function detachInitiativeMetric(MarketingInitiative $marketingInitiative, MarketingPerformanceMetric $marketingPerformanceMetric) {
        $marketingInitiative->performanceMetrics()->detach($marketingPerformanceMetric->id);
        return response()->json(['message' => 'Metric detached successfully']);
    }
    public function indexAllInitiativeMetrics(MarketingInitiative $marketingInitiative) {
        return $marketingInitiative->getAllMetrics();
    }

    // Activity <-> Metric Management
    public function indexActivityMetrics(MarketingActivity $marketingActivity) {
        return $marketingActivity->performanceMetrics()
            ->withPivot(['target_value'])
            ->get();
    }
    public function attachActivityMetric(Request $request, MarketingActivity $marketingActivity) {
        $validated = $request->validate($this->metricAttachRules());

        $result = MarketingMetricsService::attachMetricToActivity(
            $marketingActivity,
            $validated['metric_id'],
            $validated['target_value'] ?? null
        );

        if ($result === null) {
            return response()->json(['error' => 'Metric already attached to this activity'], 409);
        }
        return $result;
    }
    public function updateActivityMetric(Request $request, MarketingActivity $marketingActivity, MarketingPerformanceMetric $marketingPerformanceMetric) {
        $validated = $request->validate([
            'target_value' => 'nullable|numeric|min:0',
        ]);
        return MarketingMetricsService::updateActivityMetric(
            $marketingActivity,
            $marketingPerformanceMetric,
            $validated['target_value'] ?? null
        );
    }
    public function detachActivityMetric(MarketingActivity $marketingActivity, MarketingPerformanceMetric $marketingPerformanceMetric) {
        $marketingActivity->performanceMetrics()->detach($marketingPerformanceMetric->id);
        return response()->json(['message' => 'Metric detached successfully']);
    }

    // Marketing Initiatives
    public function indexInitiatives(Request $request) {
        return MarketingInitiative::filteredQuery($request);
    }
    public function showInitiative(MarketingInitiative $marketingInitiative) {
        $marketingInitiative->load([
            'parent',
            'children.children',
            'channels',
            'workflows.marketingActivities.i18n',
            'initiativeActivities.parentActivity',
            'initiativeActivities.childActivities',
            'initiativeActivities.performanceMetrics',
            'initiativeActivities.i18n',
            'users',
        ]);

        $marketingInitiative->performance_metrics = $marketingInitiative->getAllMetrics();
        return $marketingInitiative;
    }
    public function storeInitiative(Request $request) {
        if (empty($request->all()) && $request->getContent()) {
            $data = json_decode($request->getContent(), true);
            $request->merge($data ?? []);
        }

        $validated = $request->validate([
            'name'                       => 'required|string|max:255',
            'parent_id'                  => 'nullable|exists:marketing_initiatives,id',
            'description'                => 'nullable|string',
            'status'                     => 'in:active,paused,completed',
            'start_date'                 => 'nullable|date',
            'end_date'                   => 'nullable|date|after_or_equal:start_date',
            'channels'                   => 'array',
            'channels.*.lead_source_id'  => 'required|exists:lead_sources,id',
            'channels.*.is_primary'      => 'boolean',
            'channels.*.custom_settings' => 'nullable|array',
        ]);
        return MarketingInitiative::createWithUser($validated, $request->user());
    }
    public function updateInitiative(Request $request, MarketingInitiative $marketingInitiative) {
        $validated = $request->validate([
            'name'        => 'string|max:255',
            'parent_id'   => 'nullable|exists:marketing_initiatives,id',
            'description' => 'nullable|string',
            'status'      => 'in:active,paused,completed',
            'start_date'  => 'nullable|date',
            'end_date'    => 'nullable|date|after_or_equal:start_date',
        ]);

        $marketingInitiative->update($validated);
        return $marketingInitiative->load(['channels', 'parent', 'performanceMetrics']);
    }
    public function destroyInitiative(MarketingInitiative $marketingInitiative) {
        $error = $marketingInitiative->getDeletionBlocker();
        if ($error) {
            return response()->json(['error' => $error], 422);
        }

        $marketingInitiative->delete();
        return response()->json(['message' => 'Initiative deleted successfully']);
    }
    public function indexInitiativeChannels(MarketingInitiative $marketingInitiative) {
        return $marketingInitiative->channels()->withPivot(['is_primary', 'custom_settings'])->get();
    }
    public function addInitiativeChannel(Request $request, MarketingInitiative $marketingInitiative) {
        $validated = $request->validate([
            'lead_source_id'  => 'required|exists:lead_sources,id',
            'is_primary'      => 'boolean',
            'custom_settings' => 'nullable|array',
        ]);

        $result = $marketingInitiative->addChannel($validated);
        if ($result === null) {
            return response()->json(['error' => 'Channel already added to this initiative'], 422);
        }
        return $result;
    }
    public function removeInitiativeChannel(MarketingInitiative $marketingInitiative, LeadSource $leadSource) {
        $result = $marketingInitiative->removeChannel($leadSource);
        if ($result === null) {
            return response()->json(['error' => 'Channel not found in this initiative'], 404);
        }
        return response()->json($result);
    }
    public function updateInitiativeChannels(Request $request, MarketingInitiative $marketingInitiative) {
        $validated = $request->validate([
            'channels'                   => 'required|array',
            'channels.*.lead_source_id'  => 'required|exists:lead_sources,id',
            'channels.*.is_primary'      => 'boolean',
            'channels.*.custom_settings' => 'nullable|array',
        ]);
        return $marketingInitiative->updateChannels($validated['channels']);
    }
    public function indexInitiativeWorkflows(MarketingInitiative $marketingInitiative) {
        return $marketingInitiative->workflows()->withPivot(['is_active'])->get();
    }
    public function attachWorkflowToInitiative(Request $request, MarketingInitiative $marketingInitiative) {
        $validated = $request->validate([
            'marketing_workflow_id' => 'required|exists:marketing_workflows,id',
            'is_active'             => 'boolean',
        ]);

        // Check if already attached
        if ($marketingInitiative->workflows()->where('marketing_workflow_id', $validated['marketing_workflow_id'])->exists()) {
            return response()->json(['error' => 'Workflow already attached to this initiative'], 422);
        }

        // Attach workflow to initiative
        $marketingInitiative->workflows()->attach($validated['marketing_workflow_id'], [
            'is_active' => $validated['is_active'] ?? true,
        ]);

        // Copy workflow activities to initiative activities
        $workflow = MarketingWorkflow::with('orderedActivities')->find($validated['marketing_workflow_id']);
        $marketingInitiative->copyWorkflowActivities($workflow);
        return $marketingInitiative->workflows()->withPivot(['is_active'])->get();
    }
    public function detachWorkflowFromInitiative(Request $request, MarketingInitiative $marketingInitiative, MarketingWorkflow $marketingWorkflow) {
        // Check if workflow exists
        if (! $marketingInitiative->workflows()->where('marketing_workflow_id', $marketingWorkflow->id)->exists()) {
            return response()->json(['error' => 'Workflow not found in this initiative'], 404);
        }

        // If requested, remove prospect activities and initiative activities for this workflow
        if ($request->boolean('remove_prospect_activities')) {
            $initiativeActivityIds = $marketingInitiative->initiativeActivities()
                ->where('marketing_workflow_id', $marketingWorkflow->id)
                ->pluck('id');

            MarketingProspectActivity::whereIn('marketing_initiative_activity_id', $initiativeActivityIds)
                ->delete();

            // Also delete the initiative activities
            $marketingInitiative->initiativeActivities()
                ->where('marketing_workflow_id', $marketingWorkflow->id)
                ->delete();
        }

        $marketingInitiative->workflows()->detach($marketingWorkflow->id);
        return response()->json([
            'message'   => 'Workflow detached successfully',
            'workflows' => $marketingInitiative->workflows()->withPivot(['is_active'])->get(),
        ]);
    }
    public function subscribeUserToInitiative(Request $request, MarketingInitiative $marketingInitiative) {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'role'    => 'nullable|string|in:owner,member',
        ]);

        // Check if user is already subscribed
        if ($marketingInitiative->users()->where('user_id', $validated['user_id'])->exists()) {
            return response()->json(['error' => 'User already subscribed to this initiative'], 422);
        }

        $marketingInitiative->users()->attach($validated['user_id'], [
            'role' => $validated['role'] ?? 'member',
        ]);
        return response()->json([
            'message' => 'User subscribed successfully',
            'users'   => $marketingInitiative->users()->get(),
        ]);
    }
    public function unsubscribeUserFromInitiative(MarketingInitiative $marketingInitiative, $userId) {
        // Check if user is subscribed
        if (! $marketingInitiative->users()->where('user_id', $userId)->exists()) {
            return response()->json(['error' => 'User not subscribed to this initiative'], 404);
        }

        $marketingInitiative->users()->detach($userId);
        return response()->json([
            'message' => 'User unsubscribed successfully',
            'users'   => $marketingInitiative->users()->get(),
        ]);
    }
    public function showInitiativeStats(MarketingInitiative $marketingInitiative) {
        $timeline  = [];
        $startDate = now()->subDays(30)->startOfDay();

        for ($i = 0; $i <= 30; $i++) {
            $date    = $startDate->copy()->addDays($i);
            $dateStr = $date->format('Y-m-d');

            $timeline[] = [
                'date'      => $dateStr,
                'timestamp' => $date->timestamp * 1000,
                'new'       => $marketingInitiative->prospects()
                    ->where('status', 'new')
                    ->where('created_at', '<=', $date->endOfDay())
                    ->count(),
                'engaged' => $marketingInitiative->prospects()
                    ->where('status', 'engaged')
                    ->where('created_at', '<=', $date->endOfDay())
                    ->count(),
                'unresponsive' => $marketingInitiative->prospects()
                    ->where('status', 'unresponsive')
                    ->where('created_at', '<=', $date->endOfDay())
                    ->count(),
                'converted' => $marketingInitiative->prospects()
                    ->where('status', 'converted')
                    ->where('created_at', '<=', $date->endOfDay())
                    ->count(),
            ];
        }

        $initiativeActivityIds = $marketingInitiative->initiativeActivities()->pluck('id')->toArray();
        $perActivityStats      = DB::table('marketing_prospect_activities')
            ->whereIn('marketing_initiative_activity_id', $initiativeActivityIds)
            ->selectRaw('marketing_initiative_activity_id,
                COUNT(*) as total,
                SUM(CASE WHEN status = "completed" THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = "skipped" THEN 1 ELSE 0 END) as skipped,
                SUM(CASE WHEN status = "pending" AND scheduled_at < NOW() THEN 1 ELSE 0 END) as overdue,
                SUM(CASE WHEN status = "pending" AND (scheduled_at IS NULL OR scheduled_at >= NOW()) THEN 1 ELSE 0 END) as pending')
            ->groupBy('marketing_initiative_activity_id')
            ->get()
            ->keyBy('marketing_initiative_activity_id');

        return [
            'prospects' => [
                'total'     => $marketingInitiative->prospects()->count(),
                'by_status' => $marketingInitiative->getProspectsCountByStatus(),
                'recent'    => $marketingInitiative->prospects()->where('created_at', '>=', now()->subDays(7))->count(),
            ],
            'activities' => $perActivityStats,
            'metrics'    => $marketingInitiative->performanceMetrics->map(fn ($metric) => [
                'id'                  => $metric->id,
                'name'                => $metric->name,
                'type'                => $metric->metric_type,
                'current_value'       => $metric->getCurrentValue(),
                'target_value'        => $metric->target_value,
                'progress_percentage' => $metric->getProgressPercentage(),
            ]),
            'timeline' => $timeline,
        ];
    }
    public function indexInitiativeRecentActivity(MarketingInitiative $marketingInitiative) {
        return MarketingProspectActivity::whereHas('marketingInitiativeActivity',
            fn ($q) => $q->where('marketing_initiative_id', $marketingInitiative->id)
        )
            ->where('status', '!=', 'pending')
            ->with(['marketingProspect', 'marketingInitiativeActivity'])
            ->latest('updated_at')
            ->limit(20)
            ->get();
    }
    public function indexInitiativesForAddon(Request $request) {
        // Return only active initiatives that the current user is subscribed to
        return MarketingInitiative::active()
            ->whereHas('users', fn ($q) => $q->where('users.id', $request->user()->id))
            ->with(['workflows.marketingActivities', 'performanceMetrics', 'channels'])
            ->get();
    }

    // Initiative Activities
    public function indexInitiativeActivities(MarketingInitiative $marketingInitiative) {
        return $marketingInitiative->marketingInitiativeActivities()
            ->with(['performanceMetrics', 'parentActivity', 'childActivities', 'i18n'])
            ->orderedByDay()
            ->get();
    }
    public function storeInitiativeActivity(Request $request, MarketingInitiative $marketingInitiative) {
        $validated = $request->validate([
            'marketing_workflow_id'   => 'nullable|exists:marketing_workflows,id',
            'name'                    => 'required|string|max:255',
            'day_offset'              => 'required|integer|min:1',
            'description'             => 'nullable|string',
            'is_required'             => 'boolean',
            'has_external_dependency' => 'boolean',
            'parent_activity_id'      => 'nullable|exists:marketing_initiative_activities,id',
            'metric_ids'              => 'array',
            'metric_ids.*'            => 'exists:marketing_performance_metrics,id',
            'quick_action'            => 'nullable|in:EMAIL,LINKEDIN,LINKEDIN_SEARCH,CALL',
        ]);
        return $marketingInitiative->createActivity($validated);
    }
    public function updateInitiativeActivity(Request $request, MarketingInitiative $marketingInitiative, MarketingInitiativeActivity $marketingInitiativeActivity) {
        if ($error = $this->assertBelongsTo($marketingInitiativeActivity, 'marketing_initiative_id', $marketingInitiative->id, 'Activity does not belong to this initiative')) {
            return $error;
        }

        $validated = $request->validate($this->activityUpdateRules('marketing_initiative_activities'));
        return $marketingInitiativeActivity->updateWithRelations($validated);
    }
    public function destroyInitiativeActivity(MarketingInitiative $marketingInitiative, MarketingInitiativeActivity $marketingInitiativeActivity) {
        if ($error = $this->assertBelongsTo($marketingInitiativeActivity, 'marketing_initiative_id', $marketingInitiative->id, 'Activity does not belong to this initiative')) {
            return $error;
        }

        $marketingInitiativeActivity->deleteWithReparent();
        return response()->json(['message' => 'Activity deleted successfully']);
    }

    // Workflows
    public function indexWorkflows(Request $request) {
        return MarketingWorkflowService::getWorkflows($request);
    }
    public function showWorkflow(MarketingWorkflow $marketingWorkflow) {
        return MarketingWorkflowService::getWorkflowWithStats($marketingWorkflow);
    }
    public function showWorkflowStats(MarketingWorkflow $marketingWorkflow) {
        $activityIds = $marketingWorkflow->marketingActivities()->pluck('id')->toArray();
        return MarketingWorkflowService::calculateActivityStats($activityIds);
    }
    public function storeWorkflow(Request $request) {
        $validated = $request->validate([
            'name'                      => 'required|string|max:255',
            'description'               => 'nullable|string',
            'is_active'                 => 'boolean',
            'activities'                => 'array',
            'activities.*.day_offset'   => 'required|integer|min:1',
            'activities.*.description'  => 'nullable|string',
            'activities.*.is_required'  => 'boolean',
            'activities.*.metric_ids'   => 'array',
            'activities.*.metric_ids.*' => 'exists:marketing_performance_metrics,id',
        ]);
        return MarketingWorkflowService::createWorkflow($validated);
    }
    public function updateWorkflow(Request $request, MarketingWorkflow $marketingWorkflow) {
        $validated = $request->validate([
            'name'        => 'string|max:255',
            'description' => 'nullable|string',
            'is_active'   => 'boolean',
        ]);

        $marketingWorkflow->update($validated);
        return $marketingWorkflow->load(['marketingActivities.performanceMetrics']);
    }
    public function destroyWorkflow(MarketingWorkflow $marketingWorkflow) {
        $error = MarketingWorkflowService::canDeleteWorkflow($marketingWorkflow);
        if ($error) {
            return response()->json(['error' => $error], 422);
        }

        $marketingWorkflow->delete();
        return response()->json(['message' => 'Workflow deleted successfully']);
    }
    public function indexWorkflowActivities(MarketingWorkflow $marketingWorkflow) {
        return MarketingWorkflowService::getWorkflowActivities($marketingWorkflow);
    }
    public function storeWorkflowActivity(Request $request, MarketingWorkflow $marketingWorkflow) {
        $validated = $request->validate([
            'name'                    => 'required|string|max:255',
            'day_offset'              => 'required|integer|min:1',
            'description'             => 'nullable|string',
            'is_required'             => 'boolean',
            'has_external_dependency' => 'boolean',
            'parent_activity_id'      => 'nullable|exists:marketing_activities,id',
            'metric_ids'              => 'array',
            'metric_ids.*'            => 'exists:marketing_performance_metrics,id',
            'quick_action'            => 'nullable|in:EMAIL,LINKEDIN,LINKEDIN_SEARCH,CALL',
        ]);
        return MarketingWorkflowService::createWorkflowActivity($marketingWorkflow, $validated);
    }
    public function updateWorkflowActivity(Request $request, MarketingWorkflow $marketingWorkflow, MarketingActivity $marketingActivity) {
        if ($error = $this->assertBelongsTo($marketingActivity, 'marketing_workflow_id', $marketingWorkflow->id, 'Activity does not belong to this workflow')) {
            return $error;
        }

        $validated = $request->validate($this->activityUpdateRules('marketing_activities'));

        $marketingActivity->update($validated);
        return $marketingActivity->load(['performanceMetrics', 'parentActivity', 'childActivities', 'i18n']);
    }
    public function destroyWorkflowActivity(MarketingWorkflow $marketingWorkflow, MarketingActivity $marketingActivity) {
        if ($error = $this->assertBelongsTo($marketingActivity, 'marketing_workflow_id', $marketingWorkflow->id, 'Activity does not belong to this workflow')) {
            return $error;
        }

        MarketingWorkflowService::deleteWorkflowActivity($marketingActivity);
        return response()->json(['message' => 'Activity deleted successfully']);
    }

    // Prospects
    public function indexProspects(Request $request) {
        return MarketingProspect::filteredQuery($request);
    }
    public function showProspectStats(Request $request) {
        return MarketingProspect::getStats();
    }
    public function showProspect(MarketingProspect $marketingProspect) {
        return $marketingProspect->load([
            'marketingInitiative',
            'leadSource',
            'activities.marketingInitiativeActivity.performanceMetrics',
            'activities' => fn ($q) => $q->orderBy('scheduled_at'),
            'companyContact.contact',
            'companyContact.company',
        ]);
    }
    public function storeProspect(Request $request) {
        $validated = $request->validate([
            'marketing_initiative_id' => 'required|exists:marketing_initiatives,id',
            'lead_source_id'          => 'nullable|exists:lead_sources,id',
            'user_id'                 => 'nullable|exists:users,id',
            'company_id'              => 'nullable|exists:companies,id',
            'company_contact_id'      => 'nullable|exists:company_contacts,id',
            'name'                    => 'nullable|string|max:255',
            'vcard'                   => 'nullable|string',
            'email'                   => 'nullable|email|max:255',
            'linkedin_url'            => 'nullable|url|max:500',
            'phone'                   => 'nullable|string|max:50',
            'company'                 => 'nullable|string|max:255',
            'position'                => 'nullable|string|max:255',
            'status'                  => 'in:new,engaged,converted,unresponsive,disqualified,on_hold',
            'added_via'               => 'in:addon,manual,import',
            'external_data'           => 'nullable|array',
            'notes'                   => 'nullable|string',
        ]);

        // Default to current user if not specified
        if (! isset($validated['user_id'])) {
            $validated['user_id'] = $request->user()->id;
        }

        $prospect = MarketingProspect::create($validated);
        return $prospect->load(['marketingInitiative', 'leadSource', 'user', 'activities']);
    }
    public function storeProspectFromAddon(Request $request) {
        $validated = $request->validate([
            'marketing_initiative_id' => 'required|exists:marketing_initiatives,id',
            'lead_source_id'          => 'required|exists:lead_sources,id',
            'vcard'                   => 'required|string',
            'external_data'           => 'nullable|array',
        ]);

        $result = MarketingProspect::createFromAddon($validated, $request->user());

        if (isset($result['error'])) {
            return response()->json($result, 409);
        }
        return $result['prospect'];
    }
    public function updateProspect(Request $request, MarketingProspect $marketingProspect) {
        $validated = $request->validate([
            'marketing_initiative_id' => 'exists:marketing_initiatives,id',
            'lead_source_id'          => 'exists:lead_sources,id',
            'user_id'                 => 'nullable|exists:users,id',
            'company_id'              => 'nullable|exists:companies,id',
            'company_contact_id'      => 'nullable|exists:company_contacts,id',
            'vcard'                   => 'nullable|string',
            'name'                    => 'string|max:255',
            'email'                   => 'nullable|email|max:255',
            'linkedin_url'            => 'nullable|url|max:500',
            'phone'                   => 'nullable|string|max:50',
            'company'                 => 'nullable|string|max:255',
            'position'                => 'nullable|string|max:255',
            'status'                  => 'in:new,engaged,converted,unresponsive,disqualified,on_hold',
            'external_data'           => 'nullable|array',
            'notes'                   => 'nullable|string',
        ]);

        $marketingProspect->update($validated);
        return $marketingProspect->load([
            'marketingInitiative',
            'leadSource',
            'user',
            'activities',
            'companyContact.contact',
            'companyContact.company',
        ]);
    }
    public function postponeProspectActivities(Request $request, MarketingProspect $marketingProspect) {
        $validated = $request->validate([
            'days' => 'required|integer|min:1|max:365',
        ]);

        $success = $marketingProspect->postponeActivities($validated['days']);

        if (! $success) {
            return response()->json(['error' => 'No pending activities to postpone'], 422);
        }
        return $marketingProspect->fresh(['activities']);
    }
    public function destroyProspect(MarketingProspect $marketingProspect) {
        $marketingProspect->delete();
        return response()->json(['message' => 'Prospect deleted successfully']);
    }
    public function linkProspectToCompany(Request $request, MarketingProspect $marketingProspect) {
        $validated = $request->validate([
            'company_id' => 'required|exists:companies,id',
        ]);
        return $marketingProspect->linkToCompany($validated['company_id']);
    }
    public function convertProspect(Request $request, MarketingProspect $marketingProspect) {
        $validated = $request->validate([
            'company_id'   => 'nullable|exists:companies,id',
            'create_new'   => 'required|boolean',
            'company_name' => 'nullable|string',
        ]);

        $result = $marketingProspect->convert(
            $validated['create_new'],
            $validated['company_id'] ?? null,
            $validated['company_name'] ?? null
        );

        if (isset($result['error'])) {
            $statusCode = str_contains($result['error'], 'already converted') ? 400 : 500;
            return response()->json(['error' => $result['error']], $statusCode);
        }
        return $result['prospect'];
    }
    public function indexProspectActivitiesForAddon(Request $request) {
        $leadSourceId = $request->get('lead_source_id');
        $initiativeId = $request->get('marketing_initiative_id');

        // Step 1: Find all prospects that have at least one overdue task
        $prospectsWithOverdueTasks = DB::table('marketing_prospect_activities as mpa')
            ->join('marketing_prospects as mp', 'mp.id', '=', 'mpa.marketing_prospect_id')
            ->select('mp.id')
            ->where('mp.user_id', $request->user()->id)
            ->whereNotIn('mp.status', ['unresponsive', 'disqualified'])
            ->where('mpa.status', 'pending')
            ->whereDate('mpa.scheduled_at', '<=', today())
            ->when($leadSourceId, fn ($q) => $q->where('mp.lead_source_id', $leadSourceId))
            ->when($initiativeId, fn ($q) => $q->where('mp.marketing_initiative_id', $initiativeId))
            ->distinct()
            ->pluck('id');

        // Step 2: For those prospects, get the OLDEST pending task (by ID)
        $oldestActivityIds = DB::table('marketing_prospect_activities as mpa')
            ->select('mpa.id', 'mpa.marketing_prospect_id')
            ->whereIn('mpa.marketing_prospect_id', $prospectsWithOverdueTasks)
            ->where('mpa.status', 'pending')
            ->get()
            ->groupBy('marketing_prospect_id')
            ->map(fn ($activities) => $activities->sortBy('id')->first()->id)
            ->values();

        // Load the activities with relations
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

        // Load ALL other pending tasks for these prospects (for accordion)
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

        // Group by prospect and mark overdue tasks
        $succeedingTasksMap = $allPendingTasks->each(fn ($task) => $task->is_overdue = $task->scheduled_at->lte(today()))
            ->groupBy('marketing_prospect_id');

        // Append succeeding_tasks to each activity
        $activities->each(function ($activity) use ($succeedingTasksMap) {
            $activity->succeeding_tasks = $succeedingTasksMap->get($activity->marketing_prospect_id, collect())->values();
        });

        // Expand i18n descriptions: convert @@i18n marker to array of localized variants
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
    public function updateProspectActivityStatus(Request $request, MarketingProspect $marketingProspect, int $activityId) {
        $validated = $request->validate($this->prospectActivityStatusRules());

        $activity = $marketingProspect->activities()->find($activityId);

        if (! $activity) {
            return response()->json(['error' => 'Activity not found'], 404);
        }

        if (! $this->applyActivityStatusUpdate($activity, $marketingProspect, $validated)) {
            return response()->json(['error' => 'Failed to update activity'], 422);
        }
        return $activity->fresh(['marketingActivity']);
    }
    public function updateProspectActivityById(Request $request, int $activityId) {
        $validated = $request->validate($this->prospectActivityStatusRules());

        $activity = MarketingProspectActivity::find($activityId);

        if (! $activity) {
            return response()->json(['error' => 'Activity not found'], 404);
        }

        $marketingProspect   = $activity->marketingProspect;
        $originalScheduledAt = $activity->scheduled_at;

        if (! $this->applyActivityStatusUpdate($activity, $marketingProspect, $validated)) {
            return response()->json(['error' => 'Failed to update activity'], 422);
        }

        // When completed, shift succeeding pending tasks by the same number of days late/early
        if ($validated['status'] === 'completed') {
            $now        = now();
            $daysOffset = $now->startOfDay()->diffInDays($originalScheduledAt->startOfDay());
            // Negative = completed late (postpone), positive = completed early (move earlier)
            $daysDifference = $now->startOfDay() > $originalScheduledAt->startOfDay()
                ? -$daysOffset
                : $daysOffset;

            if ($daysDifference != 0) {
                MarketingProspectActivity::where('marketing_prospect_id', $marketingProspect->id)
                    ->where('status', 'pending')
                    ->where('scheduled_at', '>', $originalScheduledAt)
                    ->update(['scheduled_at' => DB::raw("DATE_ADD(scheduled_at, INTERVAL {$daysDifference} DAY)")]);
            }
        }
        return $activity->fresh(['marketingActivity', 'marketingProspect']);
    }

    // Performance Metrics
    public function indexMetrics(Request $request) {
        $metrics = MarketingPerformanceMetric::with(['marketingInitiative'])
            ->when($request->has('marketing_initiative_id'), fn ($q) => $q->where('marketing_initiative_id', $request->marketing_initiative_id))
            ->when($request->has('metric_type'), fn ($q) => $q->where('metric_type', $request->metric_type))
            ->when($request->has('is_inherited'), fn ($q) => $q->where('is_inherited', $request->boolean('is_inherited')))
            ->latest()
            ->get();

        // Append statistics to each metric
        return $metrics->map(function ($metric) {
            $stats = $metric->getActivityStatistics();
            return array_merge($metric->toArray(), [
                'activity_stats'      => $stats,
                'current_value'       => $metric->getCurrentValue(),
                'progress_percentage' => round($metric->getProgressPercentage(), 2),
            ]);
        });
    }
    public function storeMetric(Request $request) {
        $validated = $request->validate([
            'marketing_initiative_id' => 'required|exists:marketing_initiatives,id',
            'name'                    => 'required|string|max:255',
            'metric_type'             => 'required|in:counter,percentage,conversion,currency,duration',
            'target_value'            => 'nullable|numeric|min:0',
            'is_inherited'            => 'boolean',
        ]);

        $metric = MarketingPerformanceMetric::create($validated);
        return $metric->load('marketingInitiative');
    }
    public function showMetricProgress(MarketingPerformanceMetric $marketingPerformanceMetric) {
        return [
            'metric'              => $marketingPerformanceMetric,
            'current_value'       => $marketingPerformanceMetric->getCurrentValue(),
            'target_value'        => $marketingPerformanceMetric->target_value,
            'progress_percentage' => round($marketingPerformanceMetric->getProgressPercentage(), 2),
            'is_target_met'       => $marketingPerformanceMetric->isTargetMet(),
            'activities_count'    => $marketingPerformanceMetric->marketingActivities()->count(),
        ];
    }
    public function getDashboardStats() {
        $heatmapStart  = now()->subDays(3)->startOfDay();
        $heatmapEnd    = now()->addDays(6)->endOfDay();
        $thirtyDaysAgo = now()->subDays(30);

        // 1. Activity schedule heatmap: past 3 days through next 6 days
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

        // 2. Recent conversions
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

        // 3. Lead source breakdown using LeadSource model
        $leadSources = LeadSource::withCount([
            'marketingProspects as total',
            'marketingProspects as converted' => fn ($q) => $q->where('status', 'converted'),
        ])
            ->orderByDesc('total')
            ->get(['id', 'name']);

        // 4. Prospect aging — active pipeline only
        $aging = MarketingProspect::whereNotIn('status', ['converted', 'disqualified'])
            ->selectRaw('
                SUM(CASE WHEN DATEDIFF(NOW(), created_at) <= 7             THEN 1 ELSE 0 END) as fresh,
                SUM(CASE WHEN DATEDIFF(NOW(), created_at) BETWEEN 8 AND 30 THEN 1 ELSE 0 END) as warm,
                SUM(CASE WHEN DATEDIFF(NOW(), created_at) BETWEEN 31 AND 90 THEN 1 ELSE 0 END) as cooling,
                SUM(CASE WHEN DATEDIFF(NOW(), created_at) > 90             THEN 1 ELSE 0 END) as stale
            ')
            ->first();

        // 5. Team performance over the last 30 days
        // Query stats per user_id first (avoids raw column vs. vcard accessor name mismatch)
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

        // Load User models to use the name accessor (resolves FN from vcard)
        $teamUsers       = User::whereIn('id', $userStats->keys())->get()->keyBy('id');
        $teamPerformance = $userStats->map(fn ($stat) => [
            'id'            => $stat->user_id,
            'name'          => $teamUsers->get($stat->user_id)?->name ?? 'Unknown',
            'completed_30d' => (int)$stat->completed_30d,
            'overdue'       => (int)$stat->overdue,
        ])->values();

        // 6. Top initiatives ranked by conversion
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

        // 7. Workflow effectiveness — completion rate + prospect conversion rate per workflow
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
}
