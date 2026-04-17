<?php

namespace App\Services;

use App\Models\Company;
use App\Models\Focus;
use App\Models\Param;
use App\Models\Project;
use App\Models\User;

class FocusStatisticsService {
    public static function getFocusCategories(): array {
        $startDate = now()->subYears(3);
        $users     = User::whereHas('activeEmployments')->get();

        $result = [];

        foreach ($users as $user) {
            $userData = [
                'id'         => $user->id,
                'name'       => $user->name,
                'categories' => [],
            ];

            $categories = [
                'orga'                 => 'whereOrga',
                'internal_projects'    => 'whereInternalProjects',
                'unpaid'               => 'whereUnpaid',
                'time_based_customers' => 'whereTimeBasedCustomer',
                'time_based_projects'  => 'whereTimeBasedProject',
                'budget_projects'      => 'whereBudgetProject',
            ];

            foreach ($categories as $categoryName => $method) {
                $categoryFoci = $user->foci()->where('started_at', '>=', $startDate);
                $categoryFoci = $categoryFoci->$method()
                    ->clusterBy('started_at', '%Y-%m', 'duration', 'month', 'sum')
                    ->get()
                    ->map(function ($item) {
                        return [
                            'month' => $item->month,
                            'sum'   => round($item->sum, 2),
                        ];
                    });

                $userData['categories'][$categoryName] = $categoryFoci;
            }

            $result[] = $userData;
        }
        return $result;
    }
    public static function getPredictionAccuracy(): array {
        $startDate = now()->subYears(2);
        $users     = User::whereHas('activeEmployments')->get();
        return $users->map(fn ($user) => $user->getPredictionAccuracyData($startDate))->toArray();
    }
    public static function getFocusAccuracy(): array {
        $startDate = now()->subYears(2);
        $users     = User::whereHas('activeEmployments')->get();
        return $users->map(fn ($user) => $user->getFocusAccuracyData($startDate))->toArray();
    }
    public static function getCompanyPredictionAccuracy(): array {
        $startDate = now()->subMonths(24);

        // Get companies with finished successful projects in the last 24 months
        $companies = Company::whereHas('projects', function ($query) use ($startDate) {
            $query->whereHas('lastFinishedSuccessfulState', function ($stateQuery) use ($startDate) {
                $stateQuery->where('project_project_state.created_at', '>=', $startDate);
            });
        })->with(['projects' => function ($query) use ($startDate) {
            $query->whereHas('lastFinishedSuccessfulState', function ($stateQuery) use ($startDate) {
                $stateQuery->where('project_project_state.created_at', '>=', $startDate);
            })->with(['invoiceItems.predictions', 'invoiceItems.foci']);
        }])->get();

        $result = [];

        foreach ($companies as $company) {
            $companyData = [
                'id'             => $company->id,
                'name'           => $company->name,
                'bias_factor'    => null,
                'projects_count' => 0,
                'items_count'    => 0,
            ];

            $allBiasFactors = [];
            $totalWeight    = 0;
            $weightedSum    = 0;

            foreach ($company->projects as $project) {
                $projectHasPredictions = false;

                foreach ($project->invoiceItems as $item) {
                    $biasResult = self::calculateItemBiasFactor($item);
                    if ($biasResult === null) {
                        continue;
                    }

                    $allBiasFactors[] = $biasResult['bias_factor'];
                    $weightedSum += $biasResult['weighted_bias'];
                    $totalWeight += $biasResult['weight'];

                    $projectHasPredictions = true;
                    $companyData['items_count']++;
                }

                if ($projectHasPredictions) {
                    $companyData['projects_count']++;
                }
            }

            if (! empty($allBiasFactors)) {
                $stats       = self::calculateBiasStatistics($allBiasFactors, $weightedSum, $totalWeight);
                $companyData = array_merge($companyData, $stats);
            }

            if ($companyData['bias_factor'] !== null) {
                $result[] = $companyData;
            }
        }
        return $result;
    }
    public static function getCompanyMonthlyPredictionAccuracy(Company $company): array {
        $startDate = now()->subMonths(36);

        $projects = $company->projects()
            ->whereHas('lastFinishedState')
            ->where('created_at', '>=', $startDate)
            ->with(['invoiceItems'])
            ->get();

        $focusByProject = Focus::where('parent_type', Project::class)
            ->whereIn('parent_id', $projects->pluck('id'))
            ->selectRaw('parent_id, SUM(duration) as total_duration')
            ->groupBy('parent_id')
            ->pluck('total_duration', 'parent_id');

        $monthlyData = [];

        foreach ($projects as $project) {
            $estimated = $project->invoiceItems->sum(fn ($item) => $item->assumedWorkload());
            if ($estimated <= 0) {
                continue;
            }

            $actual = $focusByProject[$project->id] ?? 0;
            if ($actual <= 0) {
                continue;
            }

            $biasFactor = $actual / $estimated;
            $month      = $project->created_at->format('Y-m');

            if (! isset($monthlyData[$month])) {
                $monthlyData[$month] = ['weighted_sum' => 0, 'total_weight' => 0, 'projects' => []];
            }
            $monthlyData[$month]['weighted_sum'] += $biasFactor * $actual;
            $monthlyData[$month]['total_weight'] += $actual;
            $monthlyData[$month]['projects'][$project->id] = true;
        }

        $result = [];
        foreach ($monthlyData as $month => $data) {
            if ($data['total_weight'] <= 0) {
                continue;
            }
            $result[] = [
                'month'          => $month,
                'bias_factor'    => round($data['weighted_sum'] / $data['total_weight'], 4),
                'projects_count' => count($data['projects']),
            ];
        }

        usort($result, fn ($a, $b) => strcmp($a['month'], $b['month']));
        return $result;
    }

    /**
     * Calculate bias factor for a single invoice item
     * Returns null if item should be skipped, otherwise returns array with bias data
     */
    public static function calculateItemBiasFactor($item): ?array {
        if ($item->predictions->isEmpty() || $item->assumedWorkload() <= 0) {
            return null;
        }

        $predictionQty = $item->predictions->sum('qty');
        if ($predictionQty <= 0) {
            return null;
        }

        $predictionInHours = self::convertPredictionToHours($predictionQty, $item->unit_name);
        if ($predictionInHours <= 0) {
            return null;
        }

        $actualFocused = $item->foci->sum('duration');
        if ($actualFocused <= 0) {
            return null;
        }

        $biasFactor = $actualFocused / $predictionInHours;
        return [
            'bias_factor'   => $biasFactor,
            'weighted_bias' => $biasFactor * $actualFocused,
            'weight'        => $actualFocused,
        ];
    }

    /**
     * Calculate bias statistics from an array of bias factors
     */
    private static function calculateBiasStatistics(array $biasFactors, float $weightedSum, float $totalWeight): array {
        if (empty($biasFactors)) {
            return [
                'bias_factor'         => null,
                'average_bias_factor' => null,
                'min_bias_factor'     => null,
                'max_bias_factor'     => null,
            ];
        }
        return [
            'bias_factor'         => $totalWeight > 0 ? round($weightedSum / $totalWeight, 4) : round(array_sum($biasFactors) / count($biasFactors), 4),
            'average_bias_factor' => round(array_sum($biasFactors) / count($biasFactors), 4),
            'min_bias_factor'     => round(min($biasFactors), 4),
            'max_bias_factor'     => round(max($biasFactors), 4),
        ];
    }

    public static function convertPredictionToHours($qty, $unitName) {
        if ($unitName === '%') {
            return 0;
        }

        $regexWorkload = [
            '(hours?|hrs?|hr\.?|h|std\.?|stunden?)'                               => 1,
            '(days?|d|day|tage?|tag|pt|pts?\.?|mt|man[-\s]?day[s]?|arbeitstage?)' => Param::get('INVOICE_HPD')->value,
        ];

        foreach ($regexWorkload as $regex => $multiplier) {
            if (preg_match("/$regex/is", $unitName)) {
                return floatval($qty * $multiplier);
            }
        }
        return floatval($qty);
    }
}
