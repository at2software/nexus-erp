import { Component, inject, Input, OnChanges, OnInit } from '@angular/core';
import { Invoice } from '@models/invoice/invoice.model';
import { FileService } from '@models/file/file.service';
import { GlobalService } from '@models/global.service';
import { InvoiceReminder } from '@models/invoice/invoice-reminder.model';
import { Observable } from 'rxjs';
import { CommonModule, DatePipe } from '@angular/common';
import { NexusModule } from '@app/nx/nexus.module';
import { ProgressBarComponent } from '@shards/progress-bar/progress-bar.component';
import { MoneyPipe } from '../../../../pipes/money.pipe';
import { ContinuousMarkerComponent } from '@shards/continuous/continuous.marker.component';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
    selector: 'invoices-table',
    templateUrl: './invoices-table.html',
    styleUrls: ['./invoices-table.scss'],
    standalone: true,
    imports: [CommonModule, DatePipe, NexusModule, ProgressBarComponent, MoneyPipe, ContinuousMarkerComponent, NgbTooltipModule]
})
export class InvoicesTable implements OnChanges, OnInit {

    @Input() invoices: Invoice[] = []
    @Input() observer?:Observable<Invoice[]>
    @Input() context:string = 'invoice.table'

    net: number
    gross: number
    gross_remaining: number
    selection: Invoice[] = []
    selectionNet: number
    selectionGross: number
    maxPaymentDuration = 0

    #fileService = inject(FileService)
    global = inject(GlobalService)

    ngOnInit() {
        this.global.onSelectionIn(() => this.invoices, 'net', 'gross').subscribe(_ => {
            [this.selection, this.selectionNet, this.selectionGross] = _
        })
    }
    ngOnChanges() {
        this.updateValues()
        if (this.observer) {
            this.invoices = []
        }
    }

    onResult(data:Invoice[]) {
        this.invoices.push(...data)
        this.updateValues()
    }
    updateValues() {
        this.net = 0
        this.gross = 0
        this.gross_remaining = 0
        this.maxPaymentDuration = 1
        this.invoices?.forEach((i: Invoice) => {
            this.net             += i.net
            this.gross           += i.gross
            this.gross_remaining += i.gross_remaining
            if (i.paid_at) {
                const duration = i.time_paid().diff(i.time_created(), 'day')
                this.maxPaymentDuration = Math.max(this.maxPaymentDuration, duration)
            }
        })
    }
    
    openFile = (inv:Invoice|InvoiceReminder) => this.#fileService.show(inv)
    percentForPaid = (_:Invoice) => _.time_paid().diff(_.time_created(), 'day') / this.maxPaymentDuration
    getCancellationName = (_:Invoice) => _.cancelles ? this.global.setting('INVOICE_CANCEL_TITLE') + ' von ' + _.cancelles.name : ''
    getCancelledByName = (_:Invoice) => _.cancelled_by ? this.global.setting('INVOICE_CANCEL_TITLE') + ': ' + _.cancelled_by.name : ''
}
