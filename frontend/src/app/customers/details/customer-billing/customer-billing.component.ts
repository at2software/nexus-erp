import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CompanyService } from '@models/company/company.service';
import { Router } from '@angular/router';
import { GlobalService } from '@models/global.service';
import { CustomerDetailGuard } from '@app/customers/customers.details.guard';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';

import { REPEATING_TYPES } from '../../../../enums/invoice-item.type';
import { Invoice } from '@models/invoice/invoice.model';
import { TBillingConsideration } from '@models/company/company.model';
import { InvoicePrepareWrapper } from '@app/invoices/_shards/invoice-prepare-wrapper/invoice-prepare-wrapper';
import { NexusModule } from '@app/nx/nexus.module';

@Component({
    selector: 'customer-billing',
    templateUrl: './customer-billing.component.html',
    styleUrls: ['./customer-billing.component.scss'],
    standalone: true,
    imports: [ToolbarComponent, ScrollbarComponent, InvoicePrepareWrapper, NexusModule]
})
export class CustomerBillingComponent implements OnInit {

    invoiceNumber:string

    parent = inject(CustomerDetailGuard)
    global = inject(GlobalService)
    #companyService = inject(CompanyService)
    #router = inject(Router)

    @ViewChild(InvoicePrepareWrapper) invoicingContent:InvoicePrepareWrapper

    ngOnInit() {
        this.invoiceNumber = Invoice.formattedInvoiceNumber()
    }

    get backendConsiderations(): TBillingConsideration[] {
        return this.parent.current?.billing_considerations || []
    }

    makeInvoice = () => {
        this.invoicingContent?.table()?.clear()
        this.#companyService.makeInvoice(this.parent.current, () => {
            this.#router.navigate(['customers/'+this.parent.current.id+'/invoices'])
        })
    }

    hasInactiveRepeatingItems = (): boolean => {
        if (!this.parent.current?.invoice_items) return false
        return this.parent.current.invoice_items.some(item =>
            (REPEATING_TYPES as readonly number[]).includes(item.type) && !item.next_recurrence_at
        )
    }

    activateRepeatingItems = () => {
        this.#companyService.activateRepeatingItems(this.parent.current.id).subscribe(() => this.invoicingContent?.table()?.reload())
    }
}
