<?php

namespace App\Services;

use App\Enums\InvoiceItemType;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Param;
use Illuminate\Support\Facades\DB;

class RevenueStatisticsService {
    public static function getCurrentYearRevenue(): array {
        $current = now()->startOfYear();
        $last    = now()->startOfYear()->subYear(1);
        return [
            'expenses' => Param::get('CASHFLOW_ANNUAL_EXPENSES')->value,
            'revenue'  => Invoice::whereBetween('created_at', [$current, now()])->sum('net'),
            'current'  => Invoice::whereBetween('created_at', [$current, now()])->clusterBy()->get()->map(fn ($_) => $_->only(['month', 'sum'])),
            'last'     => Invoice::whereBetween('created_at', [$last, $current])->clusterBy('DATE_ADD(created_at, INTERVAL 1 YEAR)')->get()->map(fn ($_) => $_->only(['month', 'sum'])),
        ];
    }
    public static function getSvBData(): array {
        $svbQuery = fn ($query) => $query->select(
            DB::raw('SUM(invoice_items.net) AS sum'),
            DB::raw("DATE_FORMAT(invoice_items.created_at, '%Y') AS year")
        )
            ->whereNotNull('invoice_id')
            ->whereIn('type', InvoiceItemType::Total)
            ->groupBy('year')->orderBy('year')->get()
            ->filter(fn ($_) => $_->year !== '0000')
            ->map(fn ($_) => ['year' => $_->year, 'sum' => intval($_->sum)])->values();
        return [
            'budget'  => $svbQuery(InvoiceItem::whereHas('project', fn ($p) => $p->where('is_time_based', false)->whereRunningOrFinishedSuccessfull())),
            'support' => $svbQuery(InvoiceItem::whereHas('project', fn ($p) => $p->where('is_time_based', true)->whereRunningOrFinishedSuccessfull())),
            'direct'  => $svbQuery(InvoiceItem::whereNull('project_id')),
        ];
    }
    public static function getInvoiceOverall(): array {
        return ['current' => Invoice::clusterBy(format: '%Y', key: 'year')->get()];
    }
}
