import { ModalBaseService } from "@app/_modals/modal-base-service";
import { ModalCombineDebriefItemsComponent } from "@app/_modals/modal-combine-debrief-items/modal-combine-debrief-items.component";
import { ModalInputComponent } from "@app/_modals/modal-input/modal-input.component";
import { NxAction, NxActionType } from "@app/nx/nx.actions";
import { NxGlobal } from "@app/nx/nx.global";
import { DebriefProblem } from "./debrief-problem.model";
import { DebriefService } from "./debrief.service";

export const DebriefProblemsActions = (that: DebriefProblem): NxAction[] => [
        {
            title: $localize`:@@i18n.common.rename:rename`,
            group: false,
            action: (success) => {
                ModalBaseService.open(ModalInputComponent, { title: $localize`:@@i18n.common.rename:rename`, initialValue: that.title })
                    .then((result) => {
                        if (result?.text?.trim()) that.update({ title: result.text }).subscribe(() => success?.(undefined));
                    });
            },
        },
        {
            title: $localize`:@@i18n.common.combine:combine`,
            group: true,
            on: () => NxGlobal.nxService.selected.length >= 2,
            action: (success) => {
                const items = NxGlobal.nxService.selected.map((s) => s.nx() as DebriefProblem);
                if (items[0] !== that) return;
                ModalBaseService.open(
                    ModalCombineDebriefItemsComponent,
                    items.map((i) => ({ id: i.id, title: i.title })),
                )
                    .then((result) => {
                        if (!result?.title?.trim()) return;
                        NxGlobal.getService(DebriefService)
                            .combineProblems(
                                items[0].id,
                                items.slice(1).map((i) => i.id),
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
                { title: $localize`:@@i18n.common.none:none`, group: true, action: () => that.update({ debrief_problem_category_id: null }) },
                ...['customer', 'process', 'technical', 'planning'].map((cat: string, index: number) => ({
                    title: cat,
                    group: true,
                    action: () => that.update({ debrief_problem_category_id: index + 1 }),
                })),
            ],
        },
        {
            title: $localize`:@@i18n.common.delete:delete`,
            action: () => that.delete(),
            type: NxActionType.Destructive,
            group: true,
            hotkey: 'CTRL+DELETE',
            roles: 'project_manager',
        },
    ];