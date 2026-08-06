<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Services\MarketingDashboardService;
use App\Services\MarketingFunnelService;
use App\Services\MarketingRemarketingService;
use Illuminate\Http\Request;

class MarketingController extends Controller {
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

    public function showUserForAddon(Request $request) {
        $user = $request->user();
        return [
            'id'    => $user->id,
            'name'  => $user->name,
            'email' => $user->email,
        ];
    }
    public function getDashboardStats() {
        return MarketingDashboardService::getDashboardStats();
    }
}
