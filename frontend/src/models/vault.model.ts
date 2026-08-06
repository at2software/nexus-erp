import { Serializable } from '@models/_core/serializable';
import { Model } from '@constants/model/type-discriminators';
import { Dictionary } from '@constants/constants';

@Model('Vault')
export class Vault extends Serializable {
    static API_PATH = (): string => 'vaults';

    prefix: string = '';
    name: string = '';
    active: boolean = false;
    keys: Dictionary<string> = {};
    missing?: string[];
}
