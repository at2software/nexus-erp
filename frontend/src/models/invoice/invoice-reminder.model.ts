import { Serializable } from '@models/_core/serializable';
import { Model } from '@constants/model/type-discriminators';

@Model('InvoiceReminder')
export class InvoiceReminder extends Serializable {
    static API_PATH = (): string => 'invoice_reminders';

    stage: number = 0;
    fee: number = 0;
    invoice_id: string = '';
    file_dir: string = '';
}
