<?php

namespace App\Services;

use App\Models\Company;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class InvoiceStatisticsService {
    public static function getCustomerStats(): array {
        $companies = Company::whereHas('invoicesLast12m')
            ->withSum(['invoices as revenue_last_1_year' => fn ($q) => $q->whereAfter(now()->subYears(1))], 'net')
            ->withSum('invoices as revenue_total', 'net')
            ->with('earliestInvoice:company_id,created_at')
            ->orderByDesc('revenue_last_1_year')
            ->get();
        return [
            'companies'       => $companies,
            'total_last_year' => $companies->sum('revenue_last_1_year'),
        ];
    }
    public static function getMonthlyRevenueRanges(): array {
        $result = [];

        for ($month = 1; $month <= 12; $month++) {
            $monthlyTotals = DB::table('invoices')
                ->selectRaw('SUM(net) as monthly_revenue')
                ->whereRaw('MONTH(created_at) = ?', [$month])
                ->groupBy(DB::raw('YEAR(created_at)'))
                ->orderBy('monthly_revenue')
                ->pluck('monthly_revenue')
                ->toArray();

            if (empty($monthlyTotals)) {
                $result[] = [
                    'month'  => $month,
                    'min'    => 0,
                    'q1'     => 0,
                    'median' => 0,
                    'q3'     => 0,
                    'max'    => 0,
                    'avg'    => 0,
                ];
                continue;
            }

            $count = count($monthlyTotals);
            $min   = $monthlyTotals[0];
            $max   = $monthlyTotals[$count - 1];
            $avg   = array_sum($monthlyTotals) / $count;

            $result[] = [
                'month'  => $month,
                'min'    => (float)$min,
                'q1'     => (float)$monthlyTotals[(int)floor($count * 0.25)],
                'median' => (float)$monthlyTotals[(int)floor($count * 0.5)],
                'q3'     => (float)$monthlyTotals[(int)floor($count * 0.75)],
                'max'    => (float)$max,
                'avg'    => (float)$avg,
            ];
        }
        return $result;
    }
    public static function getMonthlySpiralRevenue(): array {
        $result    = [];
        $startDate = Carbon::now()->subYears(5)->startOfMonth();
        $endDate   = Carbon::now()->endOfMonth();

        $current = $startDate->copy();
        while ($current <= $endDate) {
            $monthRevenue = DB::table('invoices')
                ->whereYear('created_at', $current->year)
                ->whereMonth('created_at', $current->month)
                ->sum('net');

            $result[] = [
                'date'    => $current->format('Y-m'),
                'revenue' => (float)$monthRevenue,
            ];

            $current->addMonth();
        }
        return $result;
    }
}
