import { NxAction, NxActionType } from "src/app/nx/nx.actions"
import { Milestone } from "./milestone.model"
import { MilestoneState, MILESTONE_STATES } from "./milestone-state.enum"
import { NxGlobal } from "@app/nx/nx.global"
import { InputModalService } from "@app/_modals/modal-input/modal-input.component"
import { NgbModal } from "@ng-bootstrap/ng-bootstrap"
import { ModalEditMilestoneComponent } from "@app/_modals/modal-edit-milestone/modal-edit-milestone.component"

export function getMilestoneActions(self: Milestone): NxAction[] {
    return [
        {
            title: $localize`:@@i18n.common.edit:edit`,
            group: false,
            action: () => {
                const modalService = NxGlobal.injector.get(NgbModal)
                const modalRef = modalService.open(ModalEditMilestoneComponent, { size: 'xl' })
                modalRef.componentInstance.init(self, self.project)
                return modalRef.result
            }
        },
        {
            title: $localize`:@@i18n.common.setState:set state`,
            group: true,
            children: () => Object.values(MilestoneState).filter(v => typeof v === 'number').map(state => ({
                title: MILESTONE_STATES[state as MilestoneState].name,
                group: true,
                type: state === MilestoneState.DONE ? NxActionType.Destructive : undefined,
                action: () => self.setState(state as MilestoneState)
            }))
        },
        {
            title: $localize`:@@i18n.tasks.assignTo:assign to...`,
            group: true,
            on: () => (NxGlobal.context instanceof Milestone) && (NxGlobal.context.project) && (NxGlobal.context.project.getAssignedUsers().length > 0) || false,
            children: () => self.getAssignmentActions()
        },
        {
            title: $localize`:@@i18n.milestone.setDuration:set duration`,
            group: false,
            on: () => !self.invoice_items || self.invoice_items.length === 0,
            action: () => {
                const inputModal = NxGlobal.getService(InputModalService)
                const initialValue = self.workload_hours?.toString() || ''
                inputModal.open(
                    $localize`:@@i18n.milestone.workloadHours:workload (hours)`,
                    false,
                    $localize`:@@i18n.milestone.setDurationInfo:Enter the estimated workload in hours for this milestone`,
                    initialValue
                ).then(result => {
                    if (result && result.text) {
                        const hours = parseFloat(result.text)
                        if (!isNaN(hours) && hours >= 0) {
                            self.update({ workload_hours: hours }).subscribe()
                        }
                    }
                }).catch(() => {
                    // Modal dismissed
                })
            }
        },
        {
            title: $localize`:@@i18n.common.delete:delete`,
            group: false,
            action: () => self.delete()
        },
    ]
}
