<?php

namespace App\Actions;

use App\Models\Company;
use App\Models\Invoice;
use App\Models\Param;
use Illuminate\Support\Carbon;

class UpdateInvoiceStatisticsAction {
    public function execute(?Company $company = null): void {
        if ($company) {
            $this->updateCompanyStatistics($company);
        } else {
            $this->updateGlobalStatistics();
        }
    }
    private function updateCompanyStatistics(Company $company): void {
        $stack = $company->invoices()->last12(now())->all();

        $revenueParam        = $company->param('INVOICE_REVENUE_12M');
        $revenueParam->value = $this->calculateStackRevenue($stack);
        $revenueParam->save();

        $degParam        = $company->param('INVOICE_DEG_12M');
        $degParam->value = $this->calculateWeightedRevenue($stack, now());
        $degParam->save();
    }
    private function updateGlobalStatistics(): void {
        $stack = Invoice::last12(now())->all();

        $revenueParam        = Param::get('INVOICE_REVENUE_12M');
        $revenueParam->value = $this->calculateStackRevenue($stack);
        $revenueParam->save();

        $degParam        = Param::get('INVOICE_DEG_12M');
        $degParam->value = $this->calculateWeightedRevenue($stack, now());
        $degParam->save();
    }
    private function calculateStackRevenue(array $stack): float {
        return array_sum(array_map(fn ($_) => $_->net, $stack));
    }
    private function calculateWeightedRevenue(array $stack, Carbon $pivot): float {
        return array_sum(array_map(
            fn ($_) => $_->net * max(1, 365 - $pivot->diffInDays($_->created_at)) / 365,
            $stack
        ));
    }
}
