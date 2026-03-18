import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';
import { Company } from '@models/company/company.model';
import { ProgressBarComponent } from '@shards/progress-bar/progress-bar.component';
import { MoneyShortPipe } from 'src/pipes/mshort.pipe';

@Component({
    selector: 'customer-quickstats',
    standalone: true,
    imports: [CommonModule, ProgressBarComponent, MoneyShortPipe],
    templateUrl: './customer-quickstats.component.html',
    styleUrl: './customer-quickstats.component.scss'
})
export class CustomerQuickstatsComponent implements OnChanges {
    @Input() company: Company
    projectSuccess:number
    paymentOverdue:number
    paymentOverdueStyle:string
    paymentDurationPerc:number
    ngOnChanges(changes:any) {
        if ('company' in changes) {
            this.projectSuccess = parseFloat(this.company.getParam('PROJECT_SUCCESS_RATE') ?? '0') * .01
            this.paymentOverdue = this.#getPaymentOverdue()
            this.paymentOverdueStyle = this.paymentOverdue > 0 ? 'red' : 'green'
            this.paymentDurationPerc = Math.abs(this.paymentOverdue) / parseFloat(this.company.getParam('INVOICE_PAYMENT_DURATION') ?? '14')
        }
    }
    #getPaymentOverdue() {
        const paidInvoices = this.company.invoices.filter(_ => _.paid_at)
        if (paidInvoices.length === 0) return 0
        const sum = paidInvoices.reduce((a, _) => a + _.time_paid().diff(_.time_due(), 'days'), 0)
        return sum / paidInvoices.length
    }
}
