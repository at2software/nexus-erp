import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { WidgetService } from '@models/widget.service';
import { BaseWidgetComponent, WidgetOptions } from '../base.widget.component';
import { Invoice } from '@models/invoice/invoice.model';
import moment from 'moment';
import { GlobalService } from '@models/global.service';
import { WidgetsModule } from '../widgets.module';
import { PermissionsDirective } from '@directives/permissions.directive';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'widget-unpaid-invoices',
    templateUrl: './widget-unpaid-invoices.component.html',
    styleUrls: ['./widget-unpaid-invoices.component.scss', './../base.widget.component.scss'],
    standalone: true,
    imports: [WidgetsModule, PermissionsDirective],
})
export class WidgetUnpaidInvoicesComponent extends BaseWidgetComponent {
    data = signal<Invoice[]>([]);
    chartData = signal<any>(undefined);
    global = inject(GlobalService);
    #widgetService = inject(WidgetService);

    defaultOptions = () => ({
        ...WidgetOptions.maxItems,
        ...WidgetOptions.chartOnly,
    });

    reload(): void {
        this.#widgetService.indexCashflow('INVOICES', { ...this.getOptionsURI(), withChart: '1' }, Invoice).subscribe((response: any) => {
            const sorted = (response.objects || [])
                .map((x: any) => { x.actions[0].action = () => x.navigate(`/financial/${x.id}`); return x; })
                .sort((a: any, b: any) => a.time_remind().valueOf() - b.time_remind().valueOf());
            sorted.forEach((_: any) => (_.var.hidden = moment().diff(_.time_remind()) < 0));
            this.data.set(sorted);
            this.value.set(sorted.reduce((a: any, b: any) => a + (b.gross_remaining ?? 0), 0));
            this.chartData.set(response.history);
        });
    }
}
