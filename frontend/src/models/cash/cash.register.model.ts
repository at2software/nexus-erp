import { Model } from '@constants/model/type-discriminators';
import { Serializable } from '@models/_core/serializable';

@Model('CashRegister')
export class CashRegister extends Serializable {
    static API_PATH = (): string => 'cash_registers';

    name: string = '';
}
