import { Type } from 'class-transformer';
import { Serializable } from '../serializable';
import { Project } from './project.model';
import { ProjectService } from './project.service';
import { getFrameworkActions } from './framework.actions';
import { Model } from '@constants/type-discriminators';

@Model('Framework')
export class Framework extends Serializable {    
    static override API_PATH = (): string => 'projects_frameworks';
    static override DB_TABLE_NAME = (): string => 'frameworks';
    override SERVICE = ProjectService;

    url: string = '';
    name: string = '';
    framework: string = '';
    framework_version: string = '';

    @Type(()=>Project) projects!: Project[];

    actions = getFrameworkActions(this);

}
