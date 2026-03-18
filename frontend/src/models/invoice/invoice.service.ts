import { Injectable } from '@angular/core';
import { map } from 'rxjs';
import { NxGlobal } from 'src/app/nx/nx.global';
import { PdfCreationType } from 'src/enums/PdfCreationType';
import { Invoice } from 'src/models/invoice/invoice.model';
import { NexusHttpService } from '../http/http.nexus';
import { Expense } from '@models/expense/expense.model';

@Injectable({ providedIn: 'root' })
export class InvoiceService extends NexusHttpService<Invoice> {

    public apiPath = 'invoices'
    public TYPE = () => Invoice

    update = (invoice: Invoice, data: any) => this.put(`invoices/${invoice.id}`, data)
    show = (id: string) => this.get('invoices/' + id)
    showLastPayments = () => this.aget('invoices/last-payments')
    cancel = (invoice: Invoice) => this.post(`invoices/${invoice.id}/cancel`)

    makePdf = (path: string, type: PdfCreationType = PdfCreationType.Preview) => this.get(path + '/pdf', { type: type })
    showCashFlow = () => this.aget('invoices/cashflow', {}, Expense)

    getCurrentNumber = () => NxGlobal.service.get('invoices/current_no').pipe(map(_ => _.value))
    getCustomerStats = () => this.get('companies/stats', {}, Object)
    getMonthlyRevenueRanges = () => this.get('invoices/monthly-revenue-ranges', {}, Object)
    getMonthlySpiralRevenue = () => this.get('invoices/monthly-spiral-revenue', {}, Object)
}
