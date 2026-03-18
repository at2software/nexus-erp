import { Component, inject, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { CASHFLOW_CHART_CHARTS, CASHFLOW_CHART_I18N, CASHFLOW_CHART_ICONS, CASHFLOW_CHART_KEYS } from '@dashboard/widgets/widget-cashflow/widget-cashflow.options';
import { InvoiceService } from '@models/invoice/invoice.service';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { ContinuousMarkerComponent } from '@shards/continuous/continuous.marker.component';
import { MoneyShortPipe } from '../../../../pipes/mshort.pipe';
import { NexusModule } from '@app/nx/nexus.module';
import { DndDirective } from '@directives/dnd.directive';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';

interface TKeyData { key: string, data:{id:number, value:number}[] }
interface TDay { day:string, values:TKeyData[] }
@Component({
    selector: 'invoices-cash-flow',
    templateUrl: './invoices-cash-flow.component.html',
    styleUrls: ['./invoices-cash-flow.component.scss'],
    standalone: true,
    imports: [NgbTooltipModule, ContinuousMarkerComponent, MoneyShortPipe, NexusModule, DndDirective, EmptyStateComponent]
})
export class InvoicesCashFlowComponent implements OnInit {
    data:TDay[]
    keys:any
    observer        : Observable<any>
    #invoiceService = inject(InvoiceService)
    ngOnInit() {
        this.keys = CASHFLOW_CHART_KEYS
        this.observer = this.#invoiceService.showCashFlow()
        this.data = []
    }
    onResult(data: any[]) {
        data.forEach(d => {
            const date = d.time_created().format('YYYY-MM-DD')
            if (!this.keys.includes(d.key)) {
                console.warn('Unknown cashflow key: ' + d.key, this.keys)
            }
            let day:TDay|undefined = this.data.find(_ => _.day === date)
            if (!day) {
                day = { day: date, values: []}
                this.data.push(day)
            }
            let key = this.valuesFor(day, d.key)
            if (!key) {
                key = { key: d.key, data: [] }
                day.values.push(key)
            }
            key.data.push({id: d.id, value: d.value})
        })
        this.data = [...this.data]
    }
    valuesFor = (day:TDay, key:string) => day.values.find(_ => _.key === key)
    i18n = (key:string) => CASHFLOW_CHART_I18N[key]
    color = (key:string) => CASHFLOW_CHART_CHARTS[key]
    hasKey = (a:any, key:string) => key in a
    headerIconFor = (key:string) => CASHFLOW_CHART_ICONS[key] || key
    onCsvUploaded = () => (this.data = [], this.observer = this.#invoiceService.showCashFlow())
}
