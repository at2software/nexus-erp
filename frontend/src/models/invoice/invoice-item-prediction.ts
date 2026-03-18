import { InvoiceItemService } from "src/models/invoice/invoice-item.service";
import { Serializable } from "../serializable";

export class InvoiceItemPrediction extends Serializable {
    static API_PATH = (): string => 'invoice_items'
    SERVICE = InvoiceItemService
    
}