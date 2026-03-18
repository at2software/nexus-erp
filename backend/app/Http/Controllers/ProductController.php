<?php

namespace App\Http\Controllers;

use App\Helpers\NLog;
use App\Models\Company;
use App\Models\InvoiceItem;
use App\Models\Product;
use App\Models\ProductGroup;
use App\Traits\ControllerHasPermissionsTrait;
use Illuminate\Http\Request;

class ProductController extends Controller {
    use ControllerHasPermissionsTrait;

    public static function index(Request $request) {
        return ProductGroup::indexAll();
    }
    public static function show(Request $request, Product $product) {
        return $product->load('invoiceItems');
    }
    public function update(Request $request, int $id) {
        return Product::findOrFail($id)->applyAndSave($request);
    }
    public function destroy(Request $request, int $id) {
        Product::findOrFail($id)->delete();
        return response()->make('success', 202);
    }
    public function store(Request $request) {
        $new = new Product;
        $new->applyAndSave($request);
        $i = new InvoiceItem(['product_id' => $new->id]);
        $i->save();
        $new->invoiceItems;
        return $new;
    }
    public function indexCustomers(Product $_) {
        $all = Company::select('companies.*')
            ->selectRaw('SUM(invoice_items.net) as revenue')
            ->join('invoices', 'invoices.company_id', '=', 'companies.id')
            ->join('invoice_items', 'invoice_items.invoice_id', '=', 'invoices.id')
            ->where('invoice_items.product_source_id', $_->id)
            ->whereNotNull('invoice_items.invoice_id')
            ->groupBy('companies.id')
            ->orderByDesc('revenue')
            ->get();

        return [
            'customers'      => $all->take(20)->values(),
            'total_revenue'  => $all->sum('revenue'),
            'total_customers' => $all->count(),
        ];
    }
    public function showSplit(Request $request, int $id) {
        // Get all invoice items for this product that have valid project references
        $invoiceItems = InvoiceItem::whereNotNull('project_id')
            ->whereNotNull('product_source_id')
            ->where('product_source_id', $id)
            ->with(['project:id,name,description', 'product:id,name'])
            ->get()
            ->map(function ($item) {
                return [
                    'id'                  => $item->id,
                    'text'                => $item->text,
                    'project_name'        => $item->project?->name,
                    'project_description' => $item->project?->description,
                    'net'                 => $item->net,
                    'created_at'          => $item->created_at,
                ];
            });
        return $invoiceItems;
    }
    public function indexRootGroups() {
        return ProductGroup::whereNull('product_group_id')->get();
    }
    public function showStatistics(Request $request) {
        $dateStart    = $request->input('dateStart');
        $dateEnd      = $request->input('dateEnd');
        $rootGroupIds = $request->input('rootGroupIds'); // array of root group IDs to filter by

        // Normalize rootGroupIds from comma-separated string to array of integers
        if ($rootGroupIds !== null && is_string($rootGroupIds)) {
            $rootGroupIds = array_map('intval', explode(',', $rootGroupIds));
        }

        // Get all descendant group IDs if root groups are specified
        $descendantGroupIds = null;
        if ($rootGroupIds !== null) {
            $descendantGroupIds = collect();
            foreach ($rootGroupIds as $rootId) {
                $rootGroup = ProductGroup::with('child_groups.child_groups.child_groups')->find($rootId);
                if ($rootGroup) {
                    $descendantGroupIds->push($rootId);
                    $descendants        = $rootGroup->getAllDescendantIds();
                    $descendantGroupIds = $descendantGroupIds->merge($descendants);
                }
            }
            $descendantGroupIds = $descendantGroupIds->unique();
        }

        // Prepare base queries using Eloquent relations
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

        // Apply date filters to all queries
        if ($dateStart && $dateEnd) {
            $topProductsQuery->whereHas('refs', fn ($query) => $query->whereBetween('created_at', [$dateStart, $dateEnd]));
            $fastestSellersQuery->whereBetween('invoice_items.created_at', [$dateStart, $dateEnd]);
            $mostRepurchasedQuery->whereBetween('invoice_items.created_at', [$dateStart, $dateEnd]);
        }

        // Apply root group filters to all queries
        if ($descendantGroupIds !== null && $descendantGroupIds->isNotEmpty()) {
            $topProductsQuery->whereIn('product_group_id', $descendantGroupIds);
            $fastestSellersQuery->whereIn('products.product_group_id', $descendantGroupIds);
            $mostRepurchasedQuery->whereIn('products.product_group_id', $descendantGroupIds);
        }

        // Execute queries with specific requirements
        $topProducts     = $topProductsQuery->withSum('refs as total_sold', 'qty')->withCount('refs as times_sold')->withSum('refs as total_revenue', 'net')->orderBy('total_revenue', 'desc')->limit(5)->get();
        $fastestSellers  = $fastestSellersQuery->groupBy('products.id')->orderBy('average_sales_speed', 'asc')->limit(5)->get();
        $mostRepurchased = $mostRepurchasedQuery->groupBy('products.id')->having('unique_customers', '>', 1)->orderBy('average_repurchase_frequency', 'desc')->limit(5)->get();

        // Timeline data: net sums by root group, clustered by month
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

        // Apply date filter to timeline
        if ($dateStart && $dateEnd) {
            $timelineQuery->whereBetween('invoice_items.created_at', [$dateStart, $dateEnd]);
        }

        // Apply root group filter to timeline
        if ($descendantGroupIds !== null && $descendantGroupIds->isNotEmpty()) {
            $timelineQuery->whereIn('products.product_group_id', $descendantGroupIds);
        }

        $timelineData = $timelineQuery
            ->groupBy('month', 'product_groups.id', 'product_groups.name', 'product_groups.color')
            ->orderBy('month')
            ->get()
            ->groupBy('month');

        // Debug: log product groups in results
        if ($descendantGroupIds !== null) {
            NLog::info('Top products result group IDs: '.json_encode($topProducts->pluck('product_group_id')->unique()->toArray()));
            NLog::info('Top products result names: '.json_encode($topProducts->pluck('name')->toArray()));
        }
        return [
            'top_products' => $topProducts->map(function ($product) {
                return $product->toArray();
            }),
            'fastest_sellers' => $fastestSellers->map(function ($product) {
                return $product->toArray();
            }),
            'most_repurchased' => $mostRepurchased->map(function ($product) {
                return $product->toArray();
            }),
            'timeline' => $timelineData,
        ];
    }
}
