import { DatePipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { NexusModule } from '@app/nx/nexus.module';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { GlobalService } from '@models/global.service';
import { Invoice } from '@models/invoice/invoice.model';
import { InvoiceService } from '@models/invoice/invoice.service';
import { MoneyPipe } from '../../../../pipes/money.pipe';

@Component({
    selector: 'actions-invoice-latest',
    templateUrl: './actions-invoice-latest.html',
    styleUrls: ['./actions-invoice-latest.scss'],
    standalone: true,
    imports: [ScrollbarComponent, NexusModule, NgbTooltipModule, DatePipe, MoneyPipe]
})
export class ActionsInvoiceLatest implements OnInit {

  invoices:Invoice[] = []
  #invoiceService = inject(InvoiceService)
  global = inject(GlobalService)

  ngOnInit(): void {
    this.#invoiceService.showLastPayments().subscribe(data => {
        this.invoices = data
    })
  }

}
