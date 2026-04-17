import { NxAction } from "src/app/nx/nx.actions"
import { PluginLink } from "./plugin-link.model"
import { NxGlobal } from "src/app/nx/nx.global"

export function getPluginLinkActions(self: PluginLink): NxAction[] {
    return [
        NxGlobal.deleteAction(self, $localize`:@@i18n.plugin.reallyDeleteThisPluginLink:really delete this plugin link?`, { roles: 'project_manager' }),
    ]
}
