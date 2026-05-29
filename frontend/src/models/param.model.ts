import { ParamService } from '@models/param.service';
import { Serializable } from './serializable';
import { Model } from '@constants/type-discriminators';

interface I18nVariant {
    language: string;
    formality: string;
    text: string;
}

@Model('Param')
export class Param extends Serializable {
    SERVICE = ParamService;

    key: string = '';
    value?: string | I18nVariant[];
    fallback: boolean = false;
    type: number = 2;
    parent_path?: string;
    id: string = '';

    static API_PATH = (): string => 'params';
    static ADDITIONAL_COLUMNS = (): string[] => ['value'];

    apiPath = () => (this.parent_path ? this.parent_path + '/' : '') + 'params/' + this.key;
    apiPathWithId = () => `${this.apiPath()}`;
}
