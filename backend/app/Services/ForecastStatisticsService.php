<?php

namespace App\Services;

use App\Models\Param;
use Carbon\Carbon;
use DateInterval;

class ForecastStatisticsService {
    public static function getLinearRegressionForecast(): array {
        $historicalData = [];
        $startDate      = now()->subYears(3);

        $forecastParam = Param::get('STATS_LINREG_FORECAST_12M');
        if ($forecastParam->history()) {
            $forecastHistory = $forecastParam->history()
                ->where('created_at', '>=', $startDate)
                ->orderBy('created_at')
                ->get()
                ->map(function ($record) {
                    return [
                        'date'           => $record->created_at->format('Y-m-01'),
                        'forecast'       => (float)$record->value,
                        'r2'             => null,
                        'standard_error' => null,
                    ];
                });

            $historicalData = $forecastHistory->keyBy('date')->unique('date')->toArray();
        }

        self::populateHistoricalData($historicalData, 'STATS_LINREG_R2', 'r2', $startDate);
        self::populateHistoricalData($historicalData, 'STATS_LINREG_STANDARD_ERROR', 'standard_error', $startDate);
        self::populateHistoricalData($historicalData, 'CASHFLOW_ANNUAL_EXPENSES', 'annual_expenses', $startDate);
        self::populateHistoricalData($historicalData, 'INVOICE_REVENUE_12M', 'revenue_12', $startDate, new DateInterval('P1Y'));
        $historicalData = array_filter($historicalData, fn ($_) => ! empty($_['r2']));

        $formulaParam   = Param::get('STATS_LINREG_FORMULA');
        $currentFormula = $formulaParam->value ?? 'No formula available';

        $currentForecast      = (float)($forecastParam->value ?? 0);
        $currentR2            = (float)(Param::get('STATS_LINREG_R2')->value ?? 0);
        $currentStandardError = (float)(Param::get('STATS_LINREG_STANDARD_ERROR')->value ?? 0);
        return [
            'current' => [
                'forecast'       => $currentForecast,
                'r2'             => $currentR2,
                'standard_error' => $currentStandardError,
                'formula'        => $currentFormula,
                'generated_at'   => $forecastParam->updated_at ? $forecastParam->updated_at->format('Y-m-d H:i:s') : null,
            ],
            'historical_data' => array_values($historicalData),
            'meta'            => [
                'data_points' => count($historicalData),
                'date_range'  => [
                    'from' => $startDate->format('Y-m-d'),
                    'to'   => now()->format('Y-m-d'),
                ],
            ],
        ];
    }
    protected static function populateHistoricalData(array &$historicalData, string $paramKey, string $fieldName, Carbon $startDate, ?DateInterval $offset = null): void {
        $param = Param::get($paramKey);
        if ($param->history()) {
            $history = $param->history()->where('created_at', '>=', $startDate)->orderBy('created_at')->get();

            foreach ($history as $record) {
                $date = $record->created_at;
                if ($offset) {
                    $date = $date->sub($offset);
                }
                $date = $date->format('Y-m-01');
                if (isset($historicalData[$date])) {
                    $historicalData[$date][$fieldName] = (float)$record->value;
                }
            }
        }
    }
}
