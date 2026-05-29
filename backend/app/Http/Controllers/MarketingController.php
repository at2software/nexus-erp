<?php

namespace App\Http\Controllers;

use App\Http\Requests\Marketing\AttachWorkflowRequest;
use App\Http\Requests\Marketing\ConvertProspectRequest;
use App\Http\Requests\Marketing\InitiativeRequest;
use App\Http\Requests\Marketing\PerformanceMetricRequest;
use App\Http\Requests\Marketing\ProspectRequest;
use App\Http\Requests\Marketing\StoreInitiativeActivityRequest;
use App\Http\Requests\Marketing\StoreInitiativeChannelRequest;
use App\Http\Requests\Marketing\StoreMetricRequest;
use App\Http\Requests\Marketing\StoreProspectFromAddonRequest;
use App\Http\Requests\Marketing\StoreWorkflowActivityRequest;
use App\Http\Requests\Marketing\SubscribeUserRequest;
use App\Http\Requests\Marketing\UpdateInitiativeChannelsRequest;
use App\Http\Requests\Marketing\UpdateTargetValueRequest;
use App\Http\Requests\Marketing\WorkflowRequest;
use App\Models\LeadSource;
use App\Models\MarketingActivity;
use App\Models\MarketingInitiative;
use App\Models\MarketingInitiativeActivity;
use App\Models\MarketingPerformanceMetric;
use App\Models\MarketingProspect;
use App\Models\MarketingProspectActivity;
use App\Models\MarketingWorkflow;
use App\Models\Project;
use App\Services\MarketingDashboardService;
use App\Services\MarketingFunnelService;
use App\Services\MarketingMetricsService;
use App\Services\MarketingRemarketingService;
use App\Services\MarketingWorkflowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
    public function storePerformanceMetric(PerformanceMetricRequest $request) {
        $metric = MarketingPerformanceMetric::create($request->validated());
        return $metric;
    }
    public function updatePerformanceMetric(PerformanceMetricRequest $request, MarketingPerformanceMetric $marketingPerformanceMetric) {
        $marketingPerformanceMetric->update($request->validated());
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
    public function updateInitiativeMetric(UpdateTargetValueRequest $request, MarketingInitiative $marketingInitiative, MarketingPerformanceMetric $marketingPerformanceMetric) {
        return MarketingMetricsService::updateInitiativeMetric(
            $marketingInitiative,
            $marketingPerformanceMetric,
            $request->validated('target_value')
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
    public function updateActivityMetric(UpdateTargetValueRequest $request, MarketingActivity $marketingActivity, MarketingPerformanceMetric $marketingPerformanceMetric) {
        return MarketingMetricsService::updateActivityMetric(
            $marketingActivity,
            $marketingPerformanceMetric,
            $request->validated('target_value')
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
    public function storeInitiative(InitiativeRequest $request) {
        return MarketingInitiative::createWithUser($request->validated(), $request->user());
    }
    public function updateInitiative(InitiativeRequest $request, MarketingInitiative $marketingInitiative) {
        $marketingInitiative->update($request->validated());
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
    public function addInitiativeChannel(StoreInitiativeChannelRequest $request, MarketingInitiative $marketingInitiative) {
        $result = $marketingInitiative->addChannel($request->validated());
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
    public function updateInitiativeChannels(UpdateInitiativeChannelsRequest $request, MarketingInitiative $marketingInitiative) {
        return $marketingInitiative->updateChannels($request->validated('channels'));
    }
    public function indexInitiativeWorkflows(MarketingInitiative $marketingInitiative) {
        return $marketingInitiative->workflows()->withPivot(['is_active'])->get();
    }
    public function attachWorkflowToInitiative(AttachWorkflowRequest $request, MarketingInitiative $marketingInitiative) {
        $validated = $request->validated();

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
    public function subscribeUserToInitiative(SubscribeUserRequest $request, MarketingInitiative $marketingInitiative) {
        $validated = $request->validated();

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
        return $marketingInitiative->getInitiativeStats();
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
    public function storeInitiativeActivity(StoreInitiativeActivityRequest $request, MarketingInitiative $marketingInitiative) {
        return $marketingInitiative->createActivity($request->validated());
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
    public function attachInitiativeActivityMetric(Request $request, MarketingInitiative $marketingInitiative, MarketingInitiativeActivity $marketingInitiativeActivity) {
        $validated = $request->validate(['metric_id' => 'required|exists:marketing_performance_metrics,id']);
        $marketingInitiativeActivity->performanceMetrics()->syncWithoutDetaching([$validated['metric_id']]);
        return response()->json(['message' => 'Metric attached']);
    }
    public function detachInitiativeActivityMetric(MarketingInitiative $marketingInitiative, MarketingInitiativeActivity $marketingInitiativeActivity, MarketingPerformanceMetric $marketingPerformanceMetric) {
        $marketingInitiativeActivity->performanceMetrics()->detach($marketingPerformanceMetric->id);
        return response()->json(['message' => 'Metric detached']);
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
    public function storeWorkflow(WorkflowRequest $request) {
        return MarketingWorkflowService::createWorkflow($request->validated());
    }
    public function updateWorkflow(WorkflowRequest $request, MarketingWorkflow $marketingWorkflow) {
        $marketingWorkflow->update($request->validated());
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
    public function storeWorkflowActivity(StoreWorkflowActivityRequest $request, MarketingWorkflow $marketingWorkflow) {
        return MarketingWorkflowService::createWorkflowActivity($marketingWorkflow, $request->validated());
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
    public function showProspectByPhone(Request $request): JsonResponse {
        $prospect = MarketingProspect::searchByPhone($request->input('phone_number', ''));
        if (!$prospect) {
            return response()->json(null);
        }
        return response()->json($prospect->load([
            'marketingInitiative',
            'leadSource',
            'companyContact.contact',
            'companyContact.company',
        ]));
    }
    public function storeProspect(ProspectRequest $request) {
        $validated = $request->validated();

        // Default to current user if not specified
        if (! isset($validated['user_id'])) {
            $validated['user_id'] = $request->user()->id;
        }

        $prospect = MarketingProspect::create($validated);
        return $prospect->load(['marketingInitiative', 'leadSource', 'user', 'activities']);
    }
    public function storeProspectFromAddon(StoreProspectFromAddonRequest $request) {
        $result = MarketingProspect::createFromAddon($request->validated(), $request->user());

        if (isset($result['error'])) {
            return response()->json($result, 409);
        }
        return $result['prospect'];
    }
    public function updateProspect(ProspectRequest $request, MarketingProspect $marketingProspect) {
        $marketingProspect->update($request->validated());
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
        $validated = $request->validate(['days' => 'required|integer|min:1|max:365']);

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
        $validated = $request->validate(['company_id' => 'required|exists:companies,id']);
        return $marketingProspect->linkToCompany($validated['company_id']);
    }
    public function convertProspect(ConvertProspectRequest $request, MarketingProspect $marketingProspect) {
        $validated = $request->validated();

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
        return MarketingDashboardService::getOverdueActivitiesForAddon(
            $request->user()->id,
            $request->get('lead_source_id'),
            $request->get('marketing_initiative_id')
        );
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

        if (! $this->applyActivityStatusUpdate($activity, $marketingProspect, $validated)) {
            return response()->json(['error' => 'Failed to update activity'], 422);
        }

        // When completed, shift succeeding pending tasks by the same number of days late/early
        if ($validated['status'] === 'completed') {
            $activity->shiftSucceedingActivities();
        }
        return $activity->fresh(['marketingActivity', 'marketingProspect']);
    }
    public function bumpProspectActivity(int $activityId) {
        $activity = MarketingProspectActivity::find($activityId);

        if (! $activity) {
            return response()->json(['error' => 'Activity not found'], 404);
        }

        $activity->bump();
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
    public function storeMetric(StoreMetricRequest $request) {
        $metric = MarketingPerformanceMetric::create($request->validated());
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
        return MarketingDashboardService::getDashboardStats();
    }
}
