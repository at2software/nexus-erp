import { Injectable } from '@angular/core';
import { map } from 'rxjs';
import { PdfCreationType } from '@enums/PdfCreationType';
import { Invoice } from '@models/invoice/invoice.model';
import { NexusHttpService } from '../http/http.nexus';
import { Expense } from '@models/expense/expense.model';
import { CustomerStatsResponse, LiquidityResponse, TimeValuePoint } from '@models/api-response';

@Injectable({ providedIn: 'root' })
export class InvoiceService extends NexusHttpService<Invoice> {
    public apiPath = 'invoices';
    override readonly model = Invoice;

    showLastPayments = () => this.aget('invoices/last-payments');
    cancel = (invoice: Invoice) => this.post(`invoices/${invoice.id}/cancel`);

    makePdf = (path: string, type: PdfCreationType = PdfCreationType.Preview) => this.get(path + '/pdf', { type: type });
    showCashFlow = () => this.aget('invoices/cashflow', {}, Expense);

    getCurrentNumber = () => this.get('invoices/current_no', {}, Object).pipe(map((r) => r.value));
    getCustomerStats = () => this.get<CustomerStatsResponse>('companies/stats');
    getMonthlyRevenueRanges = () => this.get('invoices/monthly-revenue-ranges', {}, Object);
    getMonthlySpiralRevenue = () => this.aget<TimeValuePoint>('invoices/monthly-spiral-revenue');
    getLiquidity = () => this.get<LiquidityResponse>('invoices/liquidity');
}
