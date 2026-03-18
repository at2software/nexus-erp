<?php

namespace App\Actions\User;

use App\Models\Focus;
use App\Models\InvoiceItem;
use App\Models\User;
use App\Services\FocusStatisticsService;

class GetPredictionAccuracyData {
    public function execute(User $user, $startDate): array {
        $completedItems = InvoiceItem::whereHas('predictions', fn ($query) => $query->where('user_id', $user->id)->whereAfter($startDate))
            ->whereHas('project', fn ($query) => $query->whereFinishedSuccessfull())
            ->with(['predictions' => fn ($query) => $query->where('user_id', $user->id)->where('qty', '>', 0)])
            ->get()
            ->filter(fn ($item) => $item->assumedWorkload() > 0);

        $monthlyAccuracy = [];
        foreach ($completedItems->groupBy(fn ($item) => $item->predictions->first()?->created_at?->format('Y-m'))->filter() as $month => $items) {
            $biasFactors = ['focused' => [], 'unfocused' => [], 'weightedFocused' => [], 'weightedUnfocused' => []];

            foreach ($items as $item) {
                $predictionQty = $item->predictions->sum('qty');
                if ($predictionQty <= 0) {
                    continue;
                }

                $predictionInHours = FocusStatisticsService::convertPredictionToHours($predictionQty, $item->unit_name);
                if ($predictionInHours <= 0) {
                    continue;
                }

                $actualFocused = Focus::where('invoice_item_id', $item->id)->sum('duration');

                if ($actualFocused <= 0) {
                    continue;
                }

                $unfocusedFactor     = $this->calculateUnfocusedFactor($item->project);
                $biasFactorFocused   = $actualFocused / $predictionInHours;
                $biasFactorUnfocused = ($actualFocused * $unfocusedFactor) / $predictionInHours;

                $biasFactors['focused'][]           = $biasFactorFocused;
                $biasFactors['unfocused'][]         = $biasFactorUnfocused;
                $biasFactors['weightedFocused'][]   = $biasFactorFocused * $actualFocused;
                $biasFactors['weightedUnfocused'][] = $biasFactorUnfocused * $actualFocused;
            }

            if (empty($biasFactors['focused'])) {
                continue;
            }

            $totalWeight       = $items->sum(fn ($item) => Focus::where('invoice_item_id', $item->id)->sum('duration'));
            $monthlyAccuracy[] = [
                'month'       => $month,
                'items_count' => $items->count(),
                'focused'     => $this->calculateStats($biasFactors['focused'], $biasFactors['weightedFocused'], $totalWeight),
                'unfocused'   => $this->calculateStats($biasFactors['unfocused'], $biasFactors['weightedUnfocused'], $totalWeight),
            ];
        }
        return [
            'id'               => $user->id,
            'name'             => $user->name,
            'monthly_accuracy' => $monthlyAccuracy,
        ];
    }
    private function calculateUnfocusedFactor($project): float {
        $totalTime   = $project->foci()->sum('duration');
        $focusedTime = $project->foci()->whereNotNull('invoice_item_id')->sum('duration');
        return $focusedTime == 0 ? 1 : $totalTime / $focusedTime;
    }
    private function calculateStats(array $factors, array $weightedFactors, float $totalWeight): array {
        if (empty($factors)) {
            return [
                'average_bias_factor'          => 0,
                'min_bias_factor'              => 0,
                'max_bias_factor'              => 0,
                'weighted_average_bias_factor' => 0,
            ];
        }
        return [
            'average_bias_factor'          => round(array_sum($factors) / count($factors), 2),
            'min_bias_factor'              => round(min($factors), 2),
            'max_bias_factor'              => round(max($factors), 2),
            'weighted_average_bias_factor' => round($totalWeight > 0 ? array_sum($weightedFactors) / $totalWeight : 0, 2),
        ];
    }
}
