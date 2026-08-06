import { InvoiceItem } from '@models/invoice/invoice-item.model';
import { Serializable } from '@models/_core/serializable';

export interface HasInvoiceItems extends Serializable {
    invoice_items: InvoiceItem[];
    companyId(): string | undefined;
}
