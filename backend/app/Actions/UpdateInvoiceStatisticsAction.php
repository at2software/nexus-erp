<?php

namespace App\Actions;

use App\Models\Company;
use App\Models\Invoice;
use App\Models\Param;
use App\Queries\InvoiceStatisticsQuery;

class UpdateInvoiceStatisticsAction {
    public function __construct(private InvoiceStatisticsQuery $query) {}

    public function execute(?Company $company = null): void {
        if ($company) {
            $stack = $company->invoices()->last12(now())->all();

            $revenueParam        = $company->param('INVOICE_REVENUE_12M');
            $revenueParam->value = $this->query->calculateStackRevenue($stack);
            $revenueParam->save();

            $degParam        = $company->param('INVOICE_DEG_12M');
            $degParam->value = $this->query->calculateWeightedRevenue($stack, now());
            $degParam->save();
        } else {
            $stack = Invoice::last12(now())->all();

            $revenueParam        = Param::get('INVOICE_REVENUE_12M');
            $revenueParam->value = $this->query->calculateStackRevenue($stack);
            $revenueParam->save();

            $degParam        = Param::get('INVOICE_DEG_12M');
            $degParam->value = $this->query->calculateWeightedRevenue($stack, now());
            $degParam->save();
        }
    }
}
