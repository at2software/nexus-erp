import { Serializable } from '@models/serializable'
import { DebriefService } from './debrief.service'
import { User } from '@models/user/user.model'
import { AutoWrap } from '@constants/autowrap'
import { NxAction, NxActionType } from '@app/nx/nx.actions'

export class DebriefSolution extends Serializable {
    static override API_PATH = (): string => 'debrief_problem_solutions'
    override SERVICE = DebriefService

    actions: NxAction[] = [
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
    created_by_user_id?: string
    avg_effectiveness_rating?: number
    usage_count: number = 0

    // Pivot fields from debrief_problem_solution
    effectiveness_rating?: number
    notes?: string

    // Raw pivot data from Laravel
    pivot?: { effectiveness_rating?: number, notes?: string }

    @AutoWrap('User') created_by?: User

    override serialize(_?: any) {
        // Copy pivot data to direct properties if present
        if (this.pivot) {
            if (this.pivot.effectiveness_rating) this.effectiveness_rating = this.pivot.effectiveness_rating
            if (this.pivot.notes) this.notes = this.pivot.notes
        }
    }

    getEffectivenessStars(): boolean[] {
        const rating = this.effectiveness_rating || 0
        return [1, 2, 3, 4, 5].map(i => i <= rating)
    }
}
