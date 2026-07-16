import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { BaseWidgetComponent, WidgetOptions } from '../base.widget.component';
import { Company } from '@models/company/company.model';
import { WIDGET_SHARED } from '../widgets.shared';
import { ShortPipe } from '@pipes/short.pipe';
import { PermissionsDirective } from '@directives/permissions.directive';
import { WidgetService } from '@models/widget.service';
import { ParamChartSeries } from '@models/api-response';


@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'widget-customer-support',
    templateUrl: './widget-customer-support.component.html',
    styleUrls: ['./../base.widget.component.scss'],
    imports: [...WIDGET_SHARED, ShortPipe, PermissionsDirective],
})
export class WidgetCustomerSupportComponent extends BaseWidgetComponent {
    data = signal<Company[]>([]);
    chartData = signal<ParamChartSeries[] | undefined>(undefined);
    #widgetService = inject(WidgetService);

    defaultOptions = () => ({
        ...WidgetOptions.maxItems,
        ...WidgetOptions.onlyMine,
        ...WidgetOptions.chartOnly,
    });

    reload(): void {
        this.#widgetService.indexCashflow('CUSTOMER_SUPPORT', { ...this.getOptionsURI(), withChart: '1' }, Company).subscribe((response) => {
            const data = response.objects.sort((a, b) => (b.foci_unbilled_sum_duration ?? 0) - (a.foci_unbilled_sum_duration ?? 0));
            this.data.set(data);
            this.value.set(data.reduce((a, b) => a + (b.foci_unbilled_sum_duration ?? 0), 0));
            this.chartData.set(response.history);
        });
    }
}
