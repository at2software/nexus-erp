import { NxAction } from '@models/_core/nx.actions';
import { PluginLink } from './plugin-link.model';
import { nx } from '@models/_core/nx-bridge';

export function getPluginLinkActions(self: PluginLink): NxAction[] {
    return [nx().deleteAction(self, $localize`:@@i18n.plugin.reallyDeleteThisPluginLink:really delete this plugin link?`, { roles: 'project_manager' })];
}
