import { Serializable } from '@models/serializable'
import { DebriefService } from './debrief.service'
import { DebriefProblemCategory } from './debrief-problem-category.model'
import { User } from '@models/user/user.model'
import { AutoWrap } from '@constants/autowrap'
import { NxAction, NxActionType } from '@app/nx/nx.actions'

export class DebriefPositive extends Serializable {
    static override API_PATH = (): string => 'debriefs/positives'
    
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

    debrief_project_debrief_id: string = ''
    title: string = ''
    description?: string
    debrief_problem_category_id?: string
    reported_by_user_id?: string

    @AutoWrap('DebriefProblemCategory') category?: DebriefProblemCategory
    @AutoWrap('User') reported_by?: User
}
