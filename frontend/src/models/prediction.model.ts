import { Serializable } from "./serializable";
import { InvoiceItemService } from "src/models/invoice/invoice-item.service";

export class Prediction extends Serializable {
    static API_PATH = (): string => 'invoice_items'
    SERVICE = InvoiceItemService

    qty:number
    user_id:string
    invoice_item_id:string
}