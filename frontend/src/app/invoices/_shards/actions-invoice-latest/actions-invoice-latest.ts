import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { Nx } from '@app/nx/nx.directive';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { Invoice } from '@models/invoice/invoice.model';
import { InvoiceService } from '@models/invoice/invoice.service';
import { MoneyPipe } from '@pipes/money.pipe';

@Component({
    selector: 'actions-invoice-latest',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './actions-invoice-latest.html',
    styleUrls: ['./actions-invoice-latest.scss'],
    imports: [ScrollbarComponent, Nx, AvatarComponent, NgbTooltipModule, DatePipe, MoneyPipe],
})
export class ActionsInvoiceLatest {
    invoices = signal<Invoice[]>([]);

    #invoiceService = inject(InvoiceService);

    constructor() {
        this.#invoiceService.showLastPayments().subscribe((data) => this.invoices.set(data));
    }
}
