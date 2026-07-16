import { ChangeDetectionStrategy, Component, computed, inject, viewChild } from '@angular/core';
import { tracked } from '@constants/tracked';
import { CompanyService } from '@models/company/company.service';
import { Router } from '@angular/router';
import { CustomerDetailGuard } from '@app/customers/customers.details.guard';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { REPEATING_TYPES } from '@enums/invoice-item.type';
import { Invoice } from '@models/invoice/invoice.model';
import { BillingConsideration } from '@models/api-response';
import { InvoicePrepareWrapper } from '@app/invoices/_shards/invoice-prepare-wrapper/invoice-prepare-wrapper';
import { NComponent } from '@shards/n/n.component';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
    selector: 'customer-billing',
    templateUrl: './customer-billing.component.html',
    imports: [ToolbarComponent, ScrollbarComponent, InvoicePrepareWrapper, NComponent, NgbDropdownModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerBillingComponent {
    #parent = inject(CustomerDetailGuard);
    #companyService = inject(CompanyService);
    #router = inject(Router);

    readonly invoiceNumber = Invoice.formattedInvoiceNumber();
    company = tracked(this.#parent.object);
    backendConsiderations = computed<BillingConsideration[]>(() => this.company().billing_considerations || []);
    invoicingContent = viewChild.required(InvoicePrepareWrapper);

    hasInactiveRepeatingItems = computed(() => {
        const items = this.company().invoice_items;
        if (!items) return false;
        return items.some((item) => (REPEATING_TYPES as readonly number[]).includes(item.type) && !item.next_recurrence_at);
    });

    makeDraftInvoice = () => this.makeInvoice(true);
    makeInvoice = (draft = false) => {
        this.invoicingContent().table()?.clear();
        this.#companyService.makeInvoice(
            this.company(),
            () => {
                // A draft is just a downloaded preview — no invoice is created to navigate to.
                if (draft) return;
                this.#router.navigate(['customers/' + this.company().id + '/invoices/prepare']);
            },
            draft,
        );
    };

    activateRepeatingItems = () => {
        this.#companyService.activateRepeatingItems(this.company().id).subscribe(() => this.invoicingContent().table()?.reload());
    };
}
