import { Model } from '@constants/model/type-discriminators';
import { Serializable } from '@models/_core/serializable';

@Model('Prediction')
export class Prediction extends Serializable {
    static API_PATH = (): string => 'invoice_items';

    qty: number = 0;
    user_id: string = '';
    invoice_item_id: string = '';
}
