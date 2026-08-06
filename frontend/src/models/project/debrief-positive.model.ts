import { Serializable } from '@models/_core/serializable';
import { DebriefService } from './debrief.service';
import { DebriefProblemCategory } from './debrief-problem-category.model';
import { User } from '@models/user/user.model';
import { signal, computed } from '@angular/core';
import { Type } from '@models/_core/hydrate';
import { NxAction, NxActionType } from '@models/_core/nx.actions';
import { map } from 'rxjs';
import { nx, TBroadcast } from '@models/_core/nx-bridge';
import { MODAL } from '@models/_core/modal-registry';
import { ModalInputResult, CombineDebriefItemsResult } from '@models/_core/modal-results';
import { Model } from '@constants/model/type-discriminators';
import { Project } from './project.model';

@Model('DebriefPositive')
export class DebriefPositive extends Serializable {
    static override API_PATH = (): string => 'debriefs/positives';
    static DB_TABLE_NAME = (): string => 'debrief_positives';


    protected override buildActions(): NxAction[] {
        return [
            {
                title: $localize`:@@i18n.common.rename:rename`,
                group: false,
                action: (success) => {
                    nx().openModal<ModalInputResult>(MODAL.input, { title: $localize`:@@i18n.common.rename:rename`, initialValue: this.title })
                        .then((result) => {
                            if (result?.text?.trim()) this.update({ title: result.text }).subscribe(() => success?.(undefined));
                        });
                },
            },
            {
                title: $localize`:@@i18n.common.combine:combine`,
                group: true,
                on: () => nx().nxService.selected.length >= 2,
                action: (success) => {
                    const items = nx().nxService.selected.map((s) => s.nx() as DebriefPositive);
                    if (items[0] !== this) return;
                    nx().openModal<CombineDebriefItemsResult>(
                        MODAL.combineDebriefItems,
                        items.map((i) => ({ id: i.id, title: i.title })),
                    )
                        .then((result) => {
                            if (!result?.title?.trim()) return;
                            nx().getService(DebriefService)
                                .combinePositives(
                                    items.map((i) => i.id),
                                    result.title,
                                )
                                .subscribe(() => success?.(undefined));
                        });
                },
            },
            {
                title: $localize`:@@i18n.debrief.setCategory:set category`,
                group: true,
                children: () => [
                    { title: $localize`:@@i18n.common.none:none`, group: true, action: () => this.update({ debrief_problem_category_id: null }) },
                    ...['customer', 'process', 'technical', 'planning'].map((cat: string, index: number) => ({
                        title: cat,
                        group: true,
                        action: () => this.update({ debrief_problem_category_id: index + 1 }),
                    })),
                ],
            },
            {
                title: $localize`:@@i18n.common.delete:delete`,
                action: () => this.delete(),
                type: NxActionType.Destructive,
                group: true,
                hotkey: 'CTRL+DELETE',
                roles: 'project_manager',
            },
        ];
    }

    _parent = signal<{id: string} | undefined>(undefined);
    debrief_project_debrief_id = computed(() => this._parent()?.id ?? '');
    title: string = '';
    description?: string;
    debrief_problem_category_id?: string;
    reported_by_user_id?: string;
    category_name?: string;
    category_color?: string;
    count: number = 0;

    @Type(()=>Project) projects: Project[] = [];
    @Type(()=>DebriefProblemCategory) category?: DebriefProblemCategory;
    @Type(()=>User) reported_by?: User;

    override delete() {
        if (this.debrief_project_debrief_id()) {
            return nx().getService(DebriefService)
                .detachPositive(this.debrief_project_debrief_id(), this.id)
                .pipe(
                    map(() => {
                        nx().broadcast({ type: TBroadcast.Delete, data: this });
                        return this;
                    }),
                );
        }
        return super.delete();
    }
}
