import { NxAction, NxActionType } from "src/app/nx/nx.actions"
import { Focus } from "./focus.model"
import { ModalBaseService } from "@app/_modals/modal-base-service"
import { ModalEditFocusComponent } from "@app/_modals/modal-edit-focus/modal-edit-focus.component"
import { ModalConfirmComponent } from "@app/_modals/modal-confirm/modal-confirm.component"
import { NxGlobal } from "src/app/nx/nx.global"

export function getFocusActions(self: Focus): NxAction[] {
    return [
        {
            title: $localize`:@@i18n.common.edit:edit`,
            action: () => ModalBaseService.open(ModalEditFocusComponent, self)
        },
        {
            title: $localize`:@@i18n.common.addToClipboard:add to clipboard`,
            group: true,
            action: () => NxGlobal.clip(self)
        },
        {
            title: $localize`:@@i18n.common.removeFromClipboard:remove from clipboard`,
            group: true,
            on: (): boolean => NxGlobal.hasClip(self),
            action: () => NxGlobal.unclip(self)
        },
        { title: $localize`:@@i18n.foci.resetToOrga:reset to organisational`, action: () => self.update({ project_id: null }).subscribe(), roles: 'hr' },
        {
            title: $localize`:@@i18n.common.delete:delete`,
            interrupt: { service: ModalConfirmComponent, args: { message: $localize`:@@i18n.common.reallyDeleteThisFocus:really delete this focus?`, title: $localize`:@@i18n.common.attention:attention` } },
            action: () => self.delete(),
            type: NxActionType.Destructive,
            group: true,
            hotkey: 'CTRL+DELETE',
            roles: 'hr'
        },
        { title: $localize`:@@i18n.foci.enableInvoicing:enable invoicing`, on: () => (!self.invoice_item_id && self.is_unpaid), action: () => self.update({ is_unpaid: false }).subscribe(), group: true, roles: 'financial' },
        { title: $localize`:@@i18n.foci.disableInvoicing:disable invoicing`, on: () => (!self.invoice_item_id && !self.is_unpaid), action: () => self.update({ is_unpaid: true }).subscribe(), group: true, roles: 'financial' },
        {
            title: $localize`:@@i18n.common.selectAll:select all...`, children: [
                {
                    title: $localize`:@@i18n.common.ofComment:...of comment`,
                    unselectsingleActionResolved: false,
                    hotkey: 'CTRL+C',
                    action: () => self.nxSelect((_: Focus) => (_.comment ?? '').trim().toLowerCase().localeCompare((self.comment ?? '').trim().toLowerCase()) == 0)
                }
            ]
        },
        ...self.markerActions(),
    ]
}
