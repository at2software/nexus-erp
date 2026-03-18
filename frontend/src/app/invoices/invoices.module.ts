import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { InvoicesDashboard } from './-/invoices-dashboard/invoices-dashboard';
import { InvoiceDashboardComponent } from './id/invoice-dashboard/invoice-dashboard.component';
import { InvoicesNavComponent } from './-/invoices-nav.component';
import { InvoiceComponent } from './id/invoice.component';
import { InvoiceExpensesComponent } from './-/invoice-expenses/invoice-expenses.component';
import { InvoicesStandingComponent } from './-/invoices-standing/invoices-standing.component';
import { InvoicesCashFlowComponent } from './-/invoices-cash-flow/invoices-cash-flow.component';
import { InvoicesCashRegisterComponent } from './-/invoices-cash-register/invoices-cash-register.component';
import { InvoicesCashRegisterDetailComponent } from './-/invoices-cash-register/invoices-cash-register-detail.component';
import { InvoicesStatsComponent } from './-/invoices-stats/invoices-stats.component';
import { InvoiceDetailGuard } from './invoice-detail.guard';

@NgModule({
    imports: [
        RouterModule.forChild([
            {
                path: '', component: InvoicesNavComponent, children: [
                    { path: '', component: InvoicesDashboard, title: $localize`:@@i18n.common.invoices:invoices` },
                    { path: 'expenses', component: InvoiceExpensesComponent, title: $localize`:@@i18n.common.expenses:expenses` },
                    { path: 'standing', component: InvoicesStandingComponent, title: $localize`:@@i18n.common.standingOrders:standing orders` },
                    { path: 'stats', component: InvoicesStatsComponent, title: $localize`:@@i18n.invoices.invoiceStats:invoice stats` },
                    { path: 'cashflow', component: InvoicesCashFlowComponent, title: $localize`:@@i18n.common.cashFlow:cash flow` },
                    { path: 'cashregisters', component: InvoicesCashRegisterComponent, title: $localize`:@@i18n.common.cashRegisters:cash registers`, children: [
                        { path: ':id', component: InvoicesCashRegisterDetailComponent },
                    ]},
                ]
            },
            {
                path: ':id', 
                component: InvoiceComponent, 
                ...InvoiceDetailGuard.routeActivators(),
                children: [
                    { path: '', component: InvoiceDashboardComponent },
                    { path: '**', redirectTo: '' },
                ]
            },
            { path: '**', redirectTo: '' },
        ]),
    ],
}) export class InvoicesModule { }
