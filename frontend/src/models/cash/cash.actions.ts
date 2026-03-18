import { NxAction, NxActionType } from "src/app/nx/nx.actions"
import { Cash } from "./cash.model"
import { ModalConfirmComponent } from "@app/_modals/modal-confirm/modal-confirm.component"

export function getCashActions(self: Cash): NxAction[] {
    return [
        {
            title: $localize`:@@i18n.common.delete:delete`,
            interrupt: { service: ModalConfirmComponent, args: { text: $localize`:@@i18n.cash.reallyDeleteThisEntry:really delete this entry?`, title: $localize`:@@i18n.common.attention:attention` } },
            action: () => self.delete(),
            group: true,
            type: NxActionType.Destructive,
            hotkey: 'CTRL+DELETE',
            roles: 'user'
        },
    ]
}
