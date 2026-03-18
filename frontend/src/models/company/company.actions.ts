import { NxAction, NxActionType } from "src/app/nx/nx.actions"
import { Company } from "./company.model"
import { NxGlobal } from "src/app/nx/nx.global"
import { ModalConfirmComponent } from "@app/_modals/modal-confirm/modal-confirm.component"

export function getCompanyActions(self: Company): NxAction[] {
    return [
        { title: $localize`:@@i18n.common.open:open`, action: () => self.navigate(self.frontendUrl()) },
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
        { title: $localize`:@@i18n.common.edit:edit`, action: () => self.navigate(`/customers/${self.id}/staff`) },
        {
            title: $localize`:@@i18n.common.delete:delete`,
            interrupt: { service: ModalConfirmComponent, args: { message: 'Really delete this company?', title: 'Attention' } },
            action: () => self.delete(),
            type: NxActionType.Destructive,
            group: true,
            hotkey: 'CTRL+DELETE',
            roles: 'admin'
        },
        {
            title: $localize`:@@i18n.common.setDeprecated:set deprecated`,
            on: () => !self.is_deprecated,
            group: true,
            type: NxActionType.Destructive,
            action: () => self.update({ is_deprecated: true }),
            roles: 'admin'
        },
        ...self.markerActions(),
    ]
}
