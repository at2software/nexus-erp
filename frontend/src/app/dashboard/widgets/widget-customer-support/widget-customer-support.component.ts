import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { BaseWidgetComponent, WidgetOptions } from '../base.widget.component';
import { Company } from '@models/company/company.model';
import { WidgetsModule } from '../widgets.module';
import { ShortPipe } from '@pipes/short.pipe';
import { PermissionsDirective } from '@directives/permissions.directive';
import { WidgetService } from '@models/widget.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'widget-customer-support',
    templateUrl: './widget-customer-support.component.html',
    styleUrls: ['./widget-customer-support.component.scss', './../base.widget.component.scss'],
    standalone: true,
    imports: [WidgetsModule, ShortPipe, PermissionsDirective],
})
export class WidgetCustomerSupportComponent extends BaseWidgetComponent {
    data = signal<Company[]>([]);
    chartData = signal<any>(undefined);
    #widgetService = inject(WidgetService);

    defaultOptions = () => ({
        ...WidgetOptions.maxItems,
        ...WidgetOptions.onlyMine,
        ...WidgetOptions.chartOnly,
    });

    reload(): void {
        this.#widgetService.indexCashflow('CUSTOMER_SUPPORT', { ...this.getOptionsURI(), withChart: '1' }, Company).subscribe((response: any) => {
            const data = (response.objects || []).sort((a: any, b: any) => b.foci_unbilled_sum_duration - a.foci_unbilled_sum_duration);
            this.data.set(data);
            this.value.set(data.reduce((a: any, b: any) => a + b.foci_unbilled_sum_duration, 0));
            this.chartData.set(response.history);
        });
    }
}
