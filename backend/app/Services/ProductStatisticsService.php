<?php

namespace App\Services;

use App\Helpers\NLog;
use App\Models\InvoiceItem;
use App\Models\Product;
use App\Models\ProductGroup;
use Illuminate\Http\Request;

class ProductStatisticsService {
    public function getStatistics(Request $request): array {
        $dateStart    = $request->input('dateStart');
        $dateEnd      = $request->input('dateEnd');
        $rootGroupIds = $request->input('rootGroupIds');

        if ($rootGroupIds !== null && is_string($rootGroupIds)) {
            $rootGroupIds = array_map('intval', explode(',', $rootGroupIds));
        }

        $descendantGroupIds = null;
        if ($rootGroupIds !== null) {
            $descendantGroupIds = collect();
            foreach ($rootGroupIds as $rootId) {
                $rootGroup = ProductGroup::with('child_groups.child_groups.child_groups')->find($rootId);
                if ($rootGroup) {
                    $descendantGroupIds->push($rootId);
                    $descendantGroupIds = $descendantGroupIds->merge($rootGroup->getAllDescendantIds());
                }
            }
            $descendantGroupIds = $descendantGroupIds->unique();
        }

        $topProductsQuery = Product::whereHas('refs');

        $fastestSellersQuery = Product::whereHas('refs')
            ->selectRaw('products.*,
                AVG(DATEDIFF(invoices.created_at, invoice_items.created_at)) as average_sales_speed,
                COUNT(invoice_items.id) as sales_count')
            ->join('invoice_items', 'products.id', '=', 'invoice_items.product_source_id')
            ->join('invoices', 'invoice_items.invoice_id', '=', 'invoices.id')
            ->whereNotNull('invoice_items.invoice_id');

        $mostRepurchasedQuery = Product::whereHas('refs')
            ->selectRaw('products.*,
                COUNT(DISTINCT invoices.company_id) as unique_customers,
                COUNT(invoice_items.id) as total_purchases,
                ROUND(COUNT(invoice_items.id) / COUNT(DISTINCT invoices.company_id), 2) as average_repurchase_frequency')
            ->join('invoice_items', 'products.id', '=', 'invoice_items.product_source_id')
            ->join('invoices', 'invoice_items.invoice_id', '=', 'invoices.id')
            ->whereNotNull('invoice_items.invoice_id');

        if ($dateStart && $dateEnd) {
            $topProductsQuery->whereHas('refs', fn ($query) => $query->whereBetween('created_at', [$dateStart, $dateEnd]));
            $fastestSellersQuery->whereBetween('invoice_items.created_at', [$dateStart, $dateEnd]);
            $mostRepurchasedQuery->whereBetween('invoice_items.created_at', [$dateStart, $dateEnd]);
        }

        if ($descendantGroupIds !== null && $descendantGroupIds->isNotEmpty()) {
            $topProductsQuery->whereIn('product_group_id', $descendantGroupIds);
            $fastestSellersQuery->whereIn('products.product_group_id', $descendantGroupIds);
            $mostRepurchasedQuery->whereIn('products.product_group_id', $descendantGroupIds);
        }

        $topProducts     = $topProductsQuery->withSum('refs as total_sold', 'qty')->withCount('refs as times_sold')->withSum('refs as total_revenue', 'net')->orderBy('total_revenue', 'desc')->limit(5)->get();
        $fastestSellers  = $fastestSellersQuery->groupBy('products.id')->orderBy('average_sales_speed', 'asc')->limit(5)->get();
        $mostRepurchased = $mostRepurchasedQuery->groupBy('products.id')->having('unique_customers', '>', 1)->orderBy('average_repurchase_frequency', 'desc')->limit(5)->get();

        $timelineQuery = InvoiceItem::whereNotNull('invoice_id')
            ->join('products', 'invoice_items.product_source_id', '=', 'products.id')
            ->join('product_groups', 'products.product_group_id', '=', 'product_groups.id')
            ->selectRaw('
                DATE_FORMAT(invoice_items.created_at, "%Y-%m") as month,
                product_groups.id as group_id,
                product_groups.name as group_name,
                product_groups.color as group_color,
                SUM(invoice_items.net) as total_net
            ');

        if ($dateStart && $dateEnd) {
            $timelineQuery->whereBetween('invoice_items.created_at', [$dateStart, $dateEnd]);
        }

        if ($descendantGroupIds !== null && $descendantGroupIds->isNotEmpty()) {
            $timelineQuery->whereIn('products.product_group_id', $descendantGroupIds);
        }

        $timelineData = $timelineQuery
            ->groupBy('month', 'product_groups.id', 'product_groups.name', 'product_groups.color')
            ->orderBy('month')
            ->get()
            ->groupBy('month');

        if ($descendantGroupIds !== null) {
            NLog::info('Top products result group IDs: '.json_encode($topProducts->pluck('product_group_id')->unique()->toArray()));
            NLog::info('Top products result names: '.json_encode($topProducts->pluck('name')->toArray()));
        }
        return [
            'top_products'     => $topProducts->map->toArray()->values(),
            'fastest_sellers'  => $fastestSellers->map->toArray()->values(),
            'most_repurchased' => $mostRepurchased->map->toArray()->values(),
            'timeline'         => $timelineData,
        ];
    }
}
