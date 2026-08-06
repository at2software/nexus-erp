import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { Nx } from '@app/nx/nx.directive';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { InvoiceService } from '@models/invoice/invoice.service';
import { modelListResource } from '@models/http/model-resource';
import { MoneyPipe } from '@pipes/money.pipe';

@Component({
    selector: 'actions-invoice-latest',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './actions-invoice-latest.html',
    styleUrls: ['./actions-invoice-latest.scss'],
    imports: [ScrollbarComponent, Nx, AvatarComponent, NgbTooltipModule, DatePipe, MoneyPipe],
})
export class ActionsInvoiceLatest {
    #invoiceService = inject(InvoiceService);

    readonly invoices = modelListResource(() => this.#invoiceService.showLastPayments()).value;
}
