import { inject, Injectable } from "@angular/core";
import { DetailGuard } from "src/guards/detail.guard";
import { Invoice } from "src/models/invoice/invoice.model";
import { InvoiceService } from "src/models/invoice/invoice.service";

@Injectable({ providedIn: 'root' })
export class InvoiceDetailGuard extends DetailGuard<Invoice> {
    service = inject(InvoiceService)
    observable =  (id: string) => this.service.show(id)
}
