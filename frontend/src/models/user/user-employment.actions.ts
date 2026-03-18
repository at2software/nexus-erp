import { NxAction, NxActionType } from "src/app/nx/nx.actions"
import { UserEmployment } from "./user-employment.model"
import { ModalConfirmComponent } from "@app/_modals/modal-confirm/modal-confirm.component"

export function getUserEmploymentActions(self: UserEmployment): NxAction[] {
    return [
        { title: 'Deactivate', on: () => self.is_active, action: () => self.update({ is_active: false }).subscribe(), roles: 'hr' },
        { title: 'Activate', on: () => !self.is_active, action: () => self.update({ is_active: true }).subscribe(), roles: 'hr' },
        {
            title: 'Delete',
            interrupt: { service: ModalConfirmComponent, args: { text: 'Really delete this employment?', title: 'Attention' } },
            action: () => self.delete(),
            type: NxActionType.Destructive,
            group: true,
            hotkey: 'CTRL+DELETE',
            roles: 'hr'
        },
    ]
}
