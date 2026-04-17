import { NxAction } from "src/app/nx/nx.actions"
import { Focus } from "./focus.model"
import { ModalBaseService } from "@app/_modals/modal-base-service"
import { ModalEditFocusComponent } from "@app/_modals/modal-edit-focus/modal-edit-focus.component"
import { NxGlobal } from "src/app/nx/nx.global"

export function getFocusActions(self: Focus): NxAction[] {
    return [
        {
            title: $localize`:@@i18n.common.edit:edit`,
            action: () => ModalBaseService.open(ModalEditFocusComponent, self)
        },
        ...NxGlobal.clipboardActions(self),
        { title: $localize`:@@i18n.foci.resetToOrga:reset to organisational`, action: () => self.update({ project_id: null }).subscribe(), roles: 'hr' },
        NxGlobal.deleteAction(self, $localize`:@@i18n.common.reallyDeleteThisFocus:really delete this focus?`, { roles: 'hr' }),
        { 
            title: $localize`:@@i18n.foci.enableInvoicing:enable invoicing`, 
            on: () => (!self.invoice_item_id && self.is_unpaid), 
            action: () => self.update({ is_unpaid: false }).subscribe(), 
            group: true, 
            roles: 'project_manager|financial' 
        },
        { 
            title: $localize`:@@i18n.foci.disableInvoicing:disable invoicing`, 
            on: () => (!self.invoice_item_id && !self.is_unpaid), 
            action: () => self.update({ is_unpaid: true }).subscribe(), 
            group: true, 
            roles: 'project_manager|financial' 
        },
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
