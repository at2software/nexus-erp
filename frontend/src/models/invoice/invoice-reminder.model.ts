import { Serializable } from "../serializable";
import { InvoiceService } from "./invoice.service";

export class InvoiceReminder extends Serializable {
    static API_PATH = (): string => 'invoice_reminders'
    SERVICE = InvoiceService

    stage     : number
    fee       : number
    invoice_id: string
    file_dir  : string
}
