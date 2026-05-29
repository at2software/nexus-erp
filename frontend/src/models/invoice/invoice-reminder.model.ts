import { Serializable } from '../serializable';
import { InvoiceService } from './invoice.service';
import { Model } from '@constants/type-discriminators';

@Model('InvoiceReminder')
export class InvoiceReminder extends Serializable {
    static API_PATH = (): string => 'invoice_reminders';
    SERVICE = InvoiceService;

    stage: number = 0;
    fee: number = 0;
    invoice_id: string = '';
    file_dir: string = '';
}
