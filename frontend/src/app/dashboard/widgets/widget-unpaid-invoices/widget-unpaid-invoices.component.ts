import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { WidgetService } from '@models/widget.service';
import { BaseWidgetComponent, WidgetOptions } from '../base.widget.component';
import { Invoice } from '@models/invoice/invoice.model';
import { dayjs } from '@constants/dates';
import { GlobalService } from '@models/global.service';
import { WIDGET_SHARED } from '../widgets.shared';
import { PermissionsDirective } from '@directives/permissions.directive';
import { ParamChartSeries } from '@models/api-response';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'widget-unpaid-invoices',
    templateUrl: './widget-unpaid-invoices.component.html',
    styleUrls: ['./../base.widget.component.scss'],
    imports: [...WIDGET_SHARED, PermissionsDirective],
})
export class WidgetUnpaidInvoicesComponent extends BaseWidgetComponent {
    data = signal<Invoice[]>([]);
    chartData = signal<ParamChartSeries[] | undefined>(undefined);
    global = inject(GlobalService);
    #widgetService = inject(WidgetService);

    defaultOptions = () => ({
        ...WidgetOptions.maxItems,
        ...WidgetOptions.chartOnly,
    });

    reload(): void {
        this.#widgetService.indexCashflow('INVOICES', { ...this.getOptionsURI(), withChart: '1' }, Invoice).subscribe((response) => {
            const sorted = response.objects
                .map((x) => { x.actions[0].action = () => x.navigateTo(`/financial/${x.id}`); return x; })
                .sort((a, b) => a.time_remind().valueOf() - b.time_remind().valueOf());
            sorted.forEach((_) => (_.var.hidden = dayjs().diff(_.time_remind()) < 0));
            this.data.set(sorted);
            this.value.set(sorted.reduce((a, b) => a + (b.gross_remaining ?? 0), 0));
            this.chartData.set(response.history);
        });
    }
}
