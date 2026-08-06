import { Serializable } from '@models/_core/serializable';
import { Model } from '@constants/model/type-discriminators';

@Model('DebriefProblemCategory')
export class DebriefProblemCategory extends Serializable {
    static override API_PATH = (): string => 'debrief_problem_categories';

    name: string = '';
    color: string = '#6c757d';
    categoryIcon: string = 'folder';
    position: number = 0;
}
