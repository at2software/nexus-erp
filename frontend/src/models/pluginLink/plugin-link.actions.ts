import { NxAction, NxActionType } from "src/app/nx/nx.actions"
import { PluginLink } from "./plugin-link.model"
import { ModalConfirmComponent } from "@app/_modals/modal-confirm/modal-confirm.component"

export function getPluginLinkActions(self: PluginLink): NxAction[] {
    return [
        {
            title: $localize`:@@i18n.common.delete:delete`,
            interrupt: { service: ModalConfirmComponent, args: { message: $localize`:@@i18n.plugin.reallyDeleteThisPluginLink:really delete this plugin link?`, title: $localize`:@@i18n.common.attention:attention` } },
            action: () => self.delete(),
            type: NxActionType.Destructive,
            group: true,
            hotkey: 'CTRL+DELETE',
            roles: 'project_manager'
        },
    ]
}
