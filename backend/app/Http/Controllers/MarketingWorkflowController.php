<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Traits\MarketingControllerHelpers;
use App\Http\Requests\Marketing\StoreWorkflowActivityRequest;
use App\Http\Requests\Marketing\WorkflowRequest;
use App\Models\MarketingActivity;
use App\Models\MarketingWorkflow;
use App\Services\MarketingWorkflowService;
use Illuminate\Http\Request;

class MarketingWorkflowController extends Controller {
    use MarketingControllerHelpers;

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
}
