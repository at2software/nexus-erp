<?php

namespace App\Actions\User;

use App\Models\User;
use Carbon\Carbon;

class GetFocusAccuracyData {
    public function execute(User $user, $startDate): array {
        $monthlyFoci = $user->foci()
            ->where('started_at', '>=', $startDate)
            ->whereBudgetProject()
            ->clusterBy('started_at', '%Y-%m', 'duration', 'month', 'sum')
            ->get();

        $monthlyAccuracy = [];
        foreach ($monthlyFoci as $monthData) {
            $allFoci = $user->foci()
                ->whereMonth('started_at', '=', Carbon::parse($monthData->month.'-01')->month)
                ->whereYear('started_at', '=', Carbon::parse($monthData->month.'-01')->year)
                ->whereBudgetProject()
                ->get();

            $focusedCount = $allFoci->whereNotNull('invoice_item_id')->count();
            $totalCount   = $allFoci->count();

            $focusedDuration = $allFoci->whereNotNull('invoice_item_id')->sum('duration');
            $totalDuration   = $allFoci->sum('duration');

            if ($totalCount > 0) {
                $monthlyAccuracy[] = [
                    'month'                       => $monthData->month,
                    'focused_percentage_count'    => round(($focusedCount / $totalCount) * 100, 1),
                    'focused_percentage_duration' => round($totalDuration > 0 ? ($focusedDuration / $totalDuration) * 100 : 0, 1),
                    'total_foci_count'            => $totalCount,
                    'focused_foci_count'          => $focusedCount,
                    'total_duration'              => round($totalDuration, 2),
                    'focused_duration'            => round($focusedDuration, 2),
                ];
            }
        }
        return [
            'id'                     => $user->id,
            'name'                   => $user->name,
            'monthly_focus_accuracy' => $monthlyAccuracy,
        ];
    }
}
