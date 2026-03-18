import { Component, inject, OnInit } from '@angular/core';
import { Invoice } from '@models/invoice/invoice.model';
import moment from 'moment';
import { deepMerge } from '@constants/deepMerge';
import { Color } from '@constants/Color';
import { InvoiceDetailChartOptions } from './invoice-detail-chart-options';
import { ModalBaseService } from '@app/_modals/modal-base-service';
import { InvoiceItem } from '@models/invoice/invoice-item.model';
import { InvoiceDetailGuard } from '@app/invoices/invoice-detail.guard';
import { InvoiceReminder } from '@models/invoice/invoice-reminder.model';
import { FileService } from '@models/file/file.service';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { CommonModule } from '@angular/common';
import { NexusModule } from '@app/nx/nexus.module';
import { InvoicePrepare } from '@app/invoices/_shards/invoice-prepare/invoice-prepare';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { MoneyPipe } from '../../../../pipes/money.pipe';
import { MoneyShortPipe } from '../../../../pipes/mshort.pipe';
import { ModalInvoiceAddInstalmentComponent } from '@app/_modals/modal-invoice-add-instalment/modal-invoice-add-instalment.component';

@Component({
    selector: 'invoice-dashboard',
    templateUrl: './invoice-dashboard.component.html',
    standalone: true,
    imports: [ToolbarComponent, ScrollbarComponent, CommonModule, NexusModule, InvoicePrepare, NgbTooltipModule, MoneyPipe, MoneyShortPipe]
})
export class InvoiceDashboardComponent implements OnInit  {

    invoice: Invoice
    options: any = InvoiceDetailChartOptions

    parent = inject(InvoiceDetailGuard)
    #modalService = inject(ModalBaseService)
    #fileService = inject(FileService)

    ngOnInit() {
        this.parent.onChange.subscribe(() => {
            this.invoice = this.parent.current
            const paid_at = this.parent.current.paid_at ? this.parent.current.time_paid() : moment()
            const options = {
                series: [
                    { name: 'Created', data: [[this.parent.current.time_created().unix() * 1000, 1]], color: Color.fromVar('orange').toHexString() },
                    { name: 'Due', data: [[this.parent.current.time_due().unix() * 1000, 2]], color: Color.fromVar('red').toHexString() },
                ],
                xaxis: {
                    min: this.parent.current.time_created().unix() * 1000,
                    max: paid_at.unix() * 1000
                },
            }
            if (this.parent.current.paid_at) options.series.push({ name: 'Paid', data: [[this.parent.current.time_paid().unix() * 1000, 3]], color: Color.fromVar('green').toHexString() })
            this.options = deepMerge(this.options, options)
        })
    }

    onInstalmentButtonClicked() {
        this.#modalService.open(ModalInvoiceAddInstalmentComponent, this.parent.current).then((item: InvoiceItem) => {
            item.store().subscribe(() => this.parent.reload())
        }).catch()
    }
    openFile = (inv: Invoice | InvoiceReminder) => this.#fileService.show(inv)

}
