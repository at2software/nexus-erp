import { PercentPipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Company } from '@models/company/company.model';
import { ProgressBarComponent } from '@shards/progress-bar/progress-bar.component';
import { MoneyShortPipe } from '@pipes/mshort.pipe';
import { tracked } from '@constants/tracked';

@Component({
    selector: 'customer-quickstats',
    standalone: true,
    imports: [PercentPipe, DecimalPipe, ProgressBarComponent, MoneyShortPipe],
    templateUrl: './customer-quickstats.component.html',
    styleUrl: './customer-quickstats.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerQuickstatsComponent {
    readonly companyIn = input<Company>(undefined, { alias: 'company' });
    readonly company = tracked(this.companyIn);

    projectSuccess = computed(() => parseFloat(this.company()?.getParam('PROJECT_SUCCESS_RATE') ?? '0') * 0.01);
    paymentOverdue = computed(() => this.company()?.averagePaymentDelay() ?? 0);
    paymentOverdueStyle = computed(() => (this.paymentOverdue() > 0 ? 'red' : 'green'));
    paymentDurationPerc = computed(() => Math.abs(this.paymentOverdue()) / parseFloat(this.company()?.getParam('INVOICE_PAYMENT_DURATION') ?? '14'));
}
