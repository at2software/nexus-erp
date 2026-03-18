import { Serializable } from '@models/serializable'
import { DebriefService } from './debrief.service'
import { DebriefProblemCategory } from './debrief-problem-category.model'
import { DebriefSolution } from './debrief-solution.model'
import { User } from '@models/user/user.model'
import { AutoWrap, AutoWrapArray } from '@constants/autowrap'
import { NxAction, NxActionType } from '@app/nx/nx.actions'

export class DebriefProblem extends Serializable {
    static override API_PATH = (): string => 'debriefs/problems'
    override SERVICE = DebriefService

    actions: NxAction[] = [
        {
            title: $localize`:@@i18n.debrief.setCategory:set category`,
            group: true,
            children: () => [
                { title: $localize`:@@i18n.common.none:none`, group: true, action: () => this.update({ debrief_problem_category_id: null }) },
                ...['customer','process','technical','planning'].map((cat: any, index: number) => ({
                    title: cat,
                    group: true,
                    action: () => this.update({ debrief_problem_category_id: index + 1 })
                }))
            ]
        },
        {
            title: $localize`:@@i18n.common.delete:delete`,
            action: () => this.delete(),
            type: NxActionType.Destructive,
            group: true,
            hotkey: 'CTRL+DELETE',
            roles: 'project_manager'
        }
    ]

    title: string = ''
    description?: string
    debrief_problem_category_id: string = ''
    created_by_user_id?: string
    usage_count: number = 0

    // Pivot fields from debrief_problem_project_debrief (populated from pivot)
    severity?: 'low' | 'medium' | 'high' | 'critical'
    context_notes?: string

    // Raw pivot data from Laravel
    pivot?: { severity?: string, context_notes?: string }

    @AutoWrap('DebriefProblemCategory') category!: DebriefProblemCategory
    @AutoWrap('User') created_by?: User
    @AutoWrapArray('DebriefSolution') solutions: DebriefSolution[] = []

    override serialize(_?: any) {
        // Copy pivot data to direct properties if present
        if (this.pivot) {
            if (this.pivot.severity) this.severity = this.pivot.severity as any
            if (this.pivot.context_notes) this.context_notes = this.pivot.context_notes
        }
    }
}
