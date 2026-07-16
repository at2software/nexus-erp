import { Routes } from '@angular/router';
import { InvoiceDetailGuard } from './invoice-detail.guard';

export const FINANCIAL_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () => import('./-/invoices-nav.component').then((m) => m.InvoicesNavComponent),
        children: [
            { path: 'invoices', loadComponent: () => import('./-/invoices-dashboard/invoices-dashboard').then((m) => m.InvoicesDashboard), title: $localize`:@@i18n.common.invoices:invoices` },
            { path: 'expenses', loadComponent: () => import('./-/invoice-expenses/invoice-expenses.component').then((m) => m.InvoiceExpensesComponent), title: $localize`:@@i18n.common.expenses:expenses` },
            { path: 'standing', loadComponent: () => import('./-/invoices-standing/invoices-standing.component').then((m) => m.InvoicesStandingComponent), title: $localize`:@@i18n.common.standingOrders:standing orders` },
            { path: 'stats', loadComponent: () => import('./-/invoices-stats/invoices-stats.component').then((m) => m.InvoicesStatsComponent), title: $localize`:@@i18n.invoices.invoiceStats:invoice stats` },
            { path: 'cashflow', loadComponent: () => import('./-/invoices-cash-flow/invoices-cash-flow.component').then((m) => m.InvoicesCashFlowComponent), title: $localize`:@@i18n.common.cashFlow:cash flow` },
            { path: 'cashregisters', loadComponent: () => import('./-/invoices-cash-register/invoices-cash-register.component').then((m) => m.InvoicesCashRegisterComponent), title: $localize`:@@i18n.common.cashRegisters:cash registers`, children: [{ path: ':id', loadComponent: () => import('./-/invoices-cash-register/invoices-cash-register-detail.component').then((m) => m.InvoicesCashRegisterDetailComponent) }] },
            { path: 'liquidity', loadComponent: () => import('./-/financial-liquidity/financial-liquidity.component').then((m) => m.FinancialLiquidityComponent), title: $localize`:@@i18n.financial.liquidity:liquidity` },
            { path: 'bank', loadComponent: () => import('./-/bank-balance/invoices-bank-balance.component').then((m) => m.InvoicesBankBalanceComponent), title: $localize`:@@i18n.invoices.bankBalance:bank balance` },
            { path: '', redirectTo: 'invoices', pathMatch: 'full' },
        ],
    },
    {
        path: ':id',
        loadComponent: () => import('./id/invoice.component').then((m) => m.InvoiceComponent),
        ...InvoiceDetailGuard.routeActivators(),
        children: [
            { path: '', loadComponent: () => import('./id/invoice-dashboard/invoice-dashboard.component').then((m) => m.InvoiceDashboardComponent) },
            { path: '**', redirectTo: '' },
        ],
    },
    { path: '**', redirectTo: '' },
];
