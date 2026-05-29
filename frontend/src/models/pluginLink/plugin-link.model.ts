import { PluginLinkService } from './plugin-link.service';
import { Serializable } from './../serializable';
import { NxAction } from '@app/nx/nx.actions';
import { getPluginLinkActions } from './plugin-link.actions';
import { Model } from '@constants/type-discriminators';

@Model('PluginLink')
export class PluginLink extends Serializable {
    type: string = '';
    name: string = '';
    url: string = '';

    static API_PATH = (): string => 'plugin_links';
    SERVICE = PluginLinkService;

    actions: NxAction[] = getPluginLinkActions(this);
}
