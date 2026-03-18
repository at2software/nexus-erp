import { Component, OnInit, inject } from '@angular/core';
import { Invoice } from '@models/invoice/invoice.model';
import { InvoiceService } from '@models/invoice/invoice.service';
import { CustomerDetailGuard } from '@app/customers/customers.details.guard';
import { Observable } from 'rxjs';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { CustomerPaymentDetailsComponent } from '@app/customers/_shards/customer-payment-details/customer-payment-details.component';
import { InvoicesTable } from '@app/invoices/_shards/invoices-table/invoices-table';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';


@Component({
    selector: 'customer-invoices',
    templateUrl: './customer-invoices.component.html',
    styleUrls: ['./customer-invoices.component.scss'],
    standalone: true,
    imports: [ScrollbarComponent, CustomerPaymentDetailsComponent, InvoicesTable, EmptyStateComponent]
})
export class CustomerInvoicesComponent implements OnInit {

    invoices: Invoice[]
    invoiceService = inject(InvoiceService)
    parent = inject(CustomerDetailGuard)
    observer:Observable<Invoice[]>

    ngOnInit() {
        this.parent.onChange.subscribe(() => {
            this.observer = this.invoiceService.index({ company_id: this.parent.current.id })
        })
    }
}
