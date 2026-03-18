<?php

namespace App\Enums;

use App\Models\Param;

class CashFlowParams {
    const DATA = [
        // 'time based customers'        => "CASHFLOW_COMPANIES_TIMEBASED",
        'annual operating cost'       => 'CASHFLOW_ANNUAL_EXPENSES',
        'bank balance'                => 'CASHFLOW_BANK_BALANCE',
        'receivables'                 => 'CASHFLOW_INVOICES',
        'repayments'                  => 'CASHFLOW_INVOICES_REPAYMENTS',
        'repayments (overdue)'        => 'CASHFLOW_INVOICES_REPAYMENTS_OVERDUE',
        'recurring invoices'          => 'CASHFLOW_INVOICES_RECURRING',
        'prepared invoices'           => 'CASHFLOW_INVOICES_PREPARED',
        'time based customer support' => 'CASHFLOW_CUSTOMER_SUPPORT',
        'time based projects'         => 'CASHFLOW_PROJECTS_TIMEBASED',
        'projects'                    => 'CASHFLOW_PROJECTS',
        'acquisitions (weighted)'     => 'CASHFLOW_PROJECTS_ACQUISITIONS',
        'linear regression'           => 'CASHFLOW_PROJECTS_LINREG',
    ];

    public static function getParams() {
        return Param::whereIn('key', array_values(self::DATA))->get();
    }
    public static function getIds() {
        return self::getParams()->map(fn ($_) => $_->id)->all();
    }
}
