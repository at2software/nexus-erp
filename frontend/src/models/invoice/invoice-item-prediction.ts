import { InvoiceItemService } from '@models/invoice/invoice-item.service';
import { Serializable } from '../serializable';
import { Model } from '@constants/type-discriminators';

@Model('InvoiceItemPrediction')
export class InvoiceItemPrediction extends Serializable {
    static API_PATH = (): string => 'invoice_items';
    SERVICE = InvoiceItemService;
}
