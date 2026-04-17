import { Component, inject, OnInit } from '@angular/core';
import { WidgetService } from 'src/models/widget.service';
import { BaseWidgetComponent, WidgetOptions } from '../base.widget.component';
import { Invoice } from 'src/models/invoice/invoice.model';
import moment from 'moment';
import { GlobalService } from '@models/global.service';
import { WidgetsModule } from '../widgets.module';
import { PermissionsDirective } from '@directives/permissions.directive';

@Component({
    selector: 'widget-unpaid-invoices',
    templateUrl: './widget-unpaid-invoices.component.html',
    styleUrls: ['./widget-unpaid-invoices.component.scss', './../base.widget.component.scss'],
    standalone: true,
    imports: [WidgetsModule, PermissionsDirective]
})
export class WidgetUnpaidInvoicesComponent extends BaseWidgetComponent implements OnInit {

    defaultOptions = () => ({
        ...WidgetOptions.maxItems,
        ...WidgetOptions.chartOnly,
    })

    data:Invoice[]
    chartData: any = undefined
    global = inject(GlobalService)
    #widgetService = inject(WidgetService)

    reload(): void {
        this.#widgetService.indexCashflow('INVOICES', { ...this.getOptionsURI(), withChart: '1' }, Invoice).subscribe((response: any) => {
            const _ = response.objects || []
            const d = _.map((x: any) => {
                x.actions[0].action = () => x.navigate(`/invoices/${x.id}`)
                return x
            }).sort((a: any, b: any) => a.time_remind().valueOf() - b.time_remind().valueOf())
            d.forEach((_: any) => _.var.hidden = moment().diff(_.time_remind()) < 0)
            this.data = d
            this.value = this.data.reduce((a: any, b: any) => a + (b.gross_remaining ?? 0) ,0)
            this.chartData = response.history
        })
    }
}
