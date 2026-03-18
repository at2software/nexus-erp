import { Component, inject, ViewChild } from '@angular/core';
import { ModalEditInvoiceItemComponent } from '@app/_modals/modal-edit-invoice-item/modal-edit-invoice-item.component';
import { InvoiceItem } from 'src/models/invoice/invoice-item.model';
import moment from 'moment';
import { InvoicesStandingComponent } from '@app/invoices/-/invoices-standing/invoices-standing.component';
import { CustomerDetailGuard } from '../../customers.details.guard';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';

import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { ModalBaseService } from '@app/_modals/modal-base-service';

@Component({
    selector: 'customer-standing-orders',
    templateUrl: './customer-standing-orders.component.html',
    styleUrls: ['./customer-standing-orders.component.scss'],
    standalone: true,
    imports: [ToolbarComponent, InvoicesStandingComponent, EmptyStateComponent, NgbDropdownModule]
})
export class CustomerStandingOrdersComponent {
    
    parent = inject(CustomerDetailGuard)
    #modal = inject(ModalBaseService)

    @ViewChild(InvoicesStandingComponent) standing:InvoicesStandingComponent

    onCreate(rec:number) {
        const item = InvoiceItem.fromJson({})
        this.#modal.open(ModalEditInvoiceItemComponent, item, this.parent.current).then((response) => {
            if (response.item) {
                response.item.type = rec
                response.item.next_recurrence_at = moment().toISOString()
                response.item.company_id = this.parent.current.id
                response.item.store().subscribe(() => this.standing.reload())
            }
        })
    }
}
