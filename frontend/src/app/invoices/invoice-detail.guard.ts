import { inject, Service } from '@angular/core';
import { DetailGuard } from '@guards/detail.guard';
import { Invoice } from '@models/invoice/invoice.model';
import { InvoiceService } from '@models/invoice/invoice.service';

@Service()
export class InvoiceDetailGuard extends DetailGuard<Invoice> {
    service = inject(InvoiceService);
    observable = (id: string) => this.service.show(id);
}
