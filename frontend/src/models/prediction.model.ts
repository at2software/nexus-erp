import { Model } from '@constants/type-discriminators';
import { Serializable } from './serializable';
import { InvoiceItemService } from '@models/invoice/invoice-item.service';

@Model('Prediction')
export class Prediction extends Serializable {
    static API_PATH = (): string => 'invoice_items';
    SERVICE = InvoiceItemService;

    qty: number = 0;
    user_id: string = '';
    invoice_item_id: string = '';
}
