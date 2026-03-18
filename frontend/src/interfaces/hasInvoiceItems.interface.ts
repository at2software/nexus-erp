import { InvoiceItem } from "src/models/invoice/invoice-item.model";
import { Serializable } from "src/models/serializable";

export interface HasInvoiceItems extends Serializable {
    invoice_items:InvoiceItem[]
    getCompanyId():string|undefined
}