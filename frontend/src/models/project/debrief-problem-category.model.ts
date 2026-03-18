import { Serializable } from '@models/serializable'
import { DebriefService } from './debrief.service'

export class DebriefProblemCategory extends Serializable {
    static override API_PATH = (): string => 'debrief_problem_categories'
    override SERVICE = DebriefService

    name: string = ''
    color: string = '#6c757d'
    categoryIcon: string = 'folder'
    position: number = 0
}
