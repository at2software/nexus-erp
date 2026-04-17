import { Serializable } from '@models/serializable'
import { DebriefService } from './debrief.service'
import { DebriefProblemCategory } from './debrief-problem-category.model'
import { User } from '@models/user/user.model'
import { AutoWrap } from '@constants/autowrap'
import { NxAction, NxActionType } from '@app/nx/nx.actions'
import { tap } from 'rxjs'
import { NxGlobal, TBroadcast } from '@app/nx/nx.global'
import { ModalBaseService } from '@app/_modals/modal-base-service'
import { ModalInputComponent } from '@app/_modals/modal-input/modal-input.component'
import { ModalCombineDebriefItemsComponent } from '@app/_modals/modal-combine-debrief-items/modal-combine-debrief-items.component'

export class DebriefPositive extends Serializable {
    static override API_PATH = (): string => 'debriefs/positives'
    static DB_TABLE_NAME = (): string => 'debrief_positives';
    
    override SERVICE = DebriefService

    actions: NxAction[] = [
        {
            title: $localize`:@@i18n.common.rename:rename`,
            group: false,
            action: (success) => {
                ModalBaseService.open(ModalInputComponent, { title: $localize`:@@i18n.common.rename:rename`, initialValue: this.title })
                    .then((result: any) => { if (result?.text?.trim()) this.update({ title: result.text }).subscribe(() => success?.(undefined)) })
                    .catch(() => { /* noop */ })
            }
        },
        {
            title: $localize`:@@i18n.common.combine:combine`,
            group: true,
            on: () => NxGlobal.nxService.selected.length >= 2,
            action: (success) => {
                const items = NxGlobal.nxService.selected.map(s => s.nx as DebriefPositive)
                if (items[0] !== this) return
                ModalBaseService.open(ModalCombineDebriefItemsComponent, items.map(i => ({ id: i.id, title: i.title })))
                    .then((result: any) => {
                        if (!result?.title?.trim()) return
                        NxGlobal.getService(DebriefService).combinePositives(items.map(i => i.id), result.title)
                            .subscribe(() => success?.(undefined))
                    }).catch(() => { /* noop */ })
            }
        },
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

    override delete() {
        if (this.debrief_project_debrief_id) {
            return NxGlobal.getService(DebriefService)
                .detachPositive(this.debrief_project_debrief_id, this.id)
                .pipe(tap(() => NxGlobal.broadcast({ type: TBroadcast.Delete, data: this })))
        }
        return super.delete()
    }
}
