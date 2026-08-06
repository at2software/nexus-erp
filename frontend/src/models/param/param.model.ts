import { Serializable } from '@models/_core/serializable';
import { Model } from '@constants/model/type-discriminators';
import { Observable } from 'rxjs';

interface I18nVariant {
    language: string;
    formality: string;
    text: string;
}

@Model('Param')
export class Param extends Serializable {

    key: string = '';
    value?: string | I18nVariant[];
    fallback: boolean = false;
    type: number = 2;
    parent_path?: string;
    id: string = '';

    static API_PATH = (): string => 'params';
    static ADDITIONAL_COLUMNS = (): string[] => ['value'];

    apiPath = () => (this.parent_path ? this.parent_path + '/' : '') + 'params/' + this.key;
    override apiPathWithId(): string { return this.apiPath() }

    static write(path: string, value: unknown): Observable<Param> {
        const marker = 'params/';
        const at = path.lastIndexOf(marker);
        const key = at < 0 ? path : path.slice(at + marker.length);
        const parent_path = at > 0 ? path.slice(0, at - 1) : undefined;
        return Param.fromJson({ key, parent_path }).update({ value }, true);
    }
}
