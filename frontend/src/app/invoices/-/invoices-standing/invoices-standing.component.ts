
import { Component, effect, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbCalendar, NgbDatepickerModule, NgbDate, NgbDateAdapter } from '@ng-bootstrap/ng-bootstrap';
import { NgbDateCarbonAdapter } from '@directives/ngb-date.adapter';
import { NexusModule } from '@app/nx/nexus.module';
import { Company } from '@models/company/company.model';
import { GlobalService } from '@models/global.service';
import { InvoiceItem } from '@models/invoice/invoice-item.model';
import { InvoiceItemService } from '@models/invoice/invoice-item.service';
import { MoneyPipe } from '../../../../pipes/money.pipe';
import { SafePipe } from '../../../../pipes/safe.pipe';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';

@Component({
    selector: 'invoices-standing',
    templateUrl: './invoices-standing.component.html',
    styleUrls: ['./invoices-standing.component.scss'],
    providers: [{ provide: NgbDateAdapter, useClass: NgbDateCarbonAdapter }],
    standalone: true,
    imports: [MoneyPipe, NexusModule, FormsModule, NgbDatepickerModule, SafePipe, EmptyStateComponent]
})
export class InvoicesStandingComponent {

    parent = input.required<Company>()

    isLoaded: boolean = false
    items:InvoiceItem[] = []
    sum:number = 0
    selection:InvoiceItem[] = []
    selectionSum = 0

    itemService = inject(InvoiceItemService)
    global      = inject(GlobalService)
    calendar    = inject(NgbCalendar)

    constructor() {
        effect(() => {
            if (this.parent()) {
                this.reload()
            }
        })

        this.global.onSelectionIn(() => this.items, 'yearlyPrice').subscribe(_ => { [this.selection, this.selectionSum] = _ })
    }
    reload() {
        this.itemService.indexStandingOrders(this.parent()).subscribe(items => {
            this.isLoaded = true
            this.items = items
            this.sum = items.reduce((a, b) => a + b.getYearlyPrice(), 0)
        })
    }

    updateDate(item: InvoiceItem, field: string, date: NgbDate) {
        const dateString = `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
        item.update({ [field]: dateString }).subscribe(() => {
            this.reload();
        });
    }

    getDaysUntilNext = (item: InvoiceItem): number => {
        if (!item.next_recurrence_at) return 0
        const today = new Date()
        const nextDate = new Date(item.next_recurrence_at)
        const diffTime = nextDate.getTime() - today.getTime()
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    }
}
