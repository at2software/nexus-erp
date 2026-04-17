import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
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
export class CustomerQuickstatsComponent {
    company = input<Company>()

    projectSuccess      = computed(() => parseFloat(this.company()?.getParam('PROJECT_SUCCESS_RATE') ?? '0') * .01)
    paymentOverdue      = computed(() => this.company()?.averagePaymentDelay() ?? 0)
    paymentOverdueStyle = computed(() => this.paymentOverdue() > 0 ? 'red' : 'green')
    paymentDurationPerc = computed(() => Math.abs(this.paymentOverdue()) / parseFloat(this.company()?.getParam('INVOICE_PAYMENT_DURATION') ?? '14'))
}
