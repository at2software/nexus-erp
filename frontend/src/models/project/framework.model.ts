import type { NxAction } from '@models/_core/nx.actions';
import { Type } from '@models/_core/hydrate';
import { Serializable } from '@models/_core/serializable';
import { Project } from './project.model';
import { getFrameworkActions } from './framework.actions';
import { Model } from '@constants/model/type-discriminators';

@Model('Framework')
export class Framework extends Serializable {    
    static override API_PATH = (): string => 'projects_frameworks';
    static override DB_TABLE_NAME = (): string => 'frameworks';

    url: string = '';
    name: string = '';
    framework: string = '';
    framework_version: string = '';

    @Type(()=>Project) projects!: Project[];

    protected override buildActions(): NxAction[] { return getFrameworkActions(this) }

}
