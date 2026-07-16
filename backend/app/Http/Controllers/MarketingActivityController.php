<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Traits\MarketingControllerHelpers;
use App\Http\Requests\Marketing\UpdateTargetValueRequest;
use App\Models\MarketingActivity;
use App\Models\MarketingPerformanceMetric;
use App\Services\MarketingMetricsService;
use Illuminate\Http\Request;

class MarketingActivityController extends Controller {
    use MarketingControllerHelpers;

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
}
