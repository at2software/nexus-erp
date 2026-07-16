<?php

namespace App\Http\Controllers;

use App\Http\Requests\Marketing\PerformanceMetricRequest;
use App\Models\MarketingPerformanceMetric;
use App\Services\MarketingMetricsService;
use Illuminate\Http\Request;

class MarketingMetricController extends Controller {
    public function indexPerformanceMetrics(Request $request) {
        return MarketingMetricsService::getPerformanceMetrics($request);
    }
    public function showPerformanceMetric(MarketingPerformanceMetric $marketingPerformanceMetric) {
        return $marketingPerformanceMetric->load([
            'marketingInitiatives' => fn ($q) => $q->select(['marketing_initiatives.id', 'name', 'status']),
            'marketingActivities.marketingWorkflow',
        ]);
    }
    public function storePerformanceMetric(PerformanceMetricRequest $request) {
        return MarketingPerformanceMetric::create($request->validated());
    }
    public function updatePerformanceMetric(PerformanceMetricRequest $request, MarketingPerformanceMetric $marketingPerformanceMetric) {
        $marketingPerformanceMetric->update($request->validated());

        return $marketingPerformanceMetric;
    }
    public function destroyPerformanceMetric(MarketingPerformanceMetric $marketingPerformanceMetric) {
        $marketingPerformanceMetric->delete();

        return response()->json(['message' => 'Performance metric deleted successfully']);
    }
}
