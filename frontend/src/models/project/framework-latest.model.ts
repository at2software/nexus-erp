import { Serializable } from '@models/_core/serializable';
import { Model } from '@constants/model/type-discriminators';

@Model('FrameworkLatest')
export class FrameworkLatest extends Serializable {
    name: string = '';
    latest_version: string = '';

    static API_PATH = (): string => 'frameworks';
}
