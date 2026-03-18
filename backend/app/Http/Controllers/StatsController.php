<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\FocusStatisticsService;
use App\Services\ForecastStatisticsService;
use App\Services\ProjectStatisticsService;
use App\Services\RevenueStatisticsService;
use App\Services\TeamStatisticsService;
use App\Services\WorkingTimeService;
use Carbon\Carbon;

class StatsController extends Controller {
    public function showRevenueCurrentYear() {
        return RevenueStatisticsService::getCurrentYearRevenue();
    }
    public function showSvB() {
        return RevenueStatisticsService::getSvBData();
    }
    public function showInvoiceOverall() {
        return RevenueStatisticsService::getInvoiceOverall();
    }
    public function showTeamStatus() {
        return TeamStatisticsService::getTeamStatus();
    }
    public function apiTeamMonitor() {
        return response()->json(TeamStatisticsService::getTeamMonitorData());
    }
    public function showMyWorkingTime() {
        return WorkingTimeService::getWorkingTimeFor(request()->user());
    }
    public function showWorkingTimeFor(User $user) {
        return WorkingTimeService::getWorkingTimeFor($user);
    }
    public function showQuoteAccuracy() {
        request()->validate([
            'startDate' => 'required|date',
            'endDate'   => 'required|date',
        ]);

        $start = Carbon::parseFromLocale(request('startDate'));
        $end   = Carbon::parseFromLocale(request('endDate'));
        return ProjectStatisticsService::getQuoteAccuracy($start, $end);
    }
    public static function clusterFor(Carbon $start, Carbon $end): string {
        $diff = $end->diffInDays($start);
        if ($diff > 365 * 4) {
            return '%Y-01-01';
        }
        if ($diff > 30 * 4) {
            return '%Y-%m-01';
        }
        return '%Y-%m-%d';
    }
    public function showLeadProbabilityByDuration($span = null) {
        $data = ProjectStatisticsService::getLeadProbabilityByDuration($span);
        if ($data === null) {
            return responseError('Not enough labeled data');
        }
        return response()->json($data);
    }
    public function showLeadProbabilityByBudget($span = null) {
        $data = ProjectStatisticsService::getLeadProbabilityByBudget($span);
        if ($data === null) {
            return responseError('Not enough labeled data');
        }
        return response()->json($data);
    }
    public function showLinearRegressionForecast() {
        return ForecastStatisticsService::getLinearRegressionForecast();
    }
    public function indexFocusCategories() {
        return response()->json(FocusStatisticsService::getFocusCategories());
    }
    public function showPredictionAccuracy() {
        return response()->json(FocusStatisticsService::getPredictionAccuracy());
    }
    public function showFocusAccuracy() {
        return response()->json(FocusStatisticsService::getFocusAccuracy());
    }
    public function showCompanyPredictionAccuracy() {
        return response()->json(FocusStatisticsService::getCompanyPredictionAccuracy());
    }
}
