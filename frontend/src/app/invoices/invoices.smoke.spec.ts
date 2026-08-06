import type { Type } from '@angular/core';
import { renderComponent } from '@testing/component-test';
import { ActionsInvoiceLatest } from '@app/invoices/_shards/actions-invoice-latest/actions-invoice-latest';
import { InvoicesBankBalanceComponent } from '@app/invoices/-/bank-balance/invoices-bank-balance.component';
import { FinancialLiquidityComponent } from '@app/invoices/-/financial-liquidity/financial-liquidity.component';
import { InvoiceExpensesComponent } from '@app/invoices/-/invoice-expenses/invoice-expenses.component';
import { InvoicesCashRegisterDetailComponent } from '@app/invoices/-/invoices-cash-register/invoices-cash-register-detail.component';
import { InvoicesCashRegisterComponent } from '@app/invoices/-/invoices-cash-register/invoices-cash-register.component';
import { InvoicesStandingComponent } from '@app/invoices/-/invoices-standing/invoices-standing.component';
import { InvoicesStatsComponent } from '@app/invoices/-/invoices-stats/invoices-stats.component';

const components: [string, Type<unknown>][] = [
    ['ActionsInvoiceLatest', ActionsInvoiceLatest],
    ['InvoicesBankBalanceComponent', InvoicesBankBalanceComponent],
    ['FinancialLiquidityComponent', FinancialLiquidityComponent],
    ['InvoiceExpensesComponent', InvoiceExpensesComponent],
    ['InvoicesCashRegisterDetailComponent', InvoicesCashRegisterDetailComponent],
    ['InvoicesCashRegisterComponent', InvoicesCashRegisterComponent],
    ['InvoicesStandingComponent', InvoicesStandingComponent],
    ['InvoicesStatsComponent', InvoicesStatsComponent],
];

// Every component here loads through the Resource API. Nothing resolves under the testing
// HTTP backend, so this asserts only that the loading state renders without throwing.
describe('invoices renders', () => {
    it.each(components)('%s', (_name, component) => {
        expect(renderComponent(component).nativeElement).toBeTruthy();
    });
});
