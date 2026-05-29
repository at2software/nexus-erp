import { Model } from '@constants/type-discriminators';
import { Serializable } from '../serializable';
import { CashService } from './cash.servcie';

@Model('CashRegister')
export class CashRegister extends Serializable {
    SERVICE = CashService;
    static API_PATH = (): string => 'cash_registers';

    name: string = '';
}
