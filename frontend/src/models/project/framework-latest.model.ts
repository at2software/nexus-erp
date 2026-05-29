import { Serializable } from '../serializable';
import { ProjectService } from './project.service';
import { Model } from '@constants/type-discriminators';

@Model('FrameworkLatest')
export class FrameworkLatest extends Serializable {
    name: string = '';
    latest_version: string = '';

    static API_PATH = (): string => 'frameworks';
    SERVICE = ProjectService;
}
