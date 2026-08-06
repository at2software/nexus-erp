import { Service } from '@angular/core';
import { PluginLink } from './plugin-link.model';
import { NexusHttpService } from './../http/http.nexus';
import { Serializable } from '@models/_core/serializable';

export type PluginLinkType = 'mattermost' | 'git';

@Service()
export class PluginLinkService extends NexusHttpService<PluginLink> {
    apiPath = 'plugin_links';
    override readonly model = PluginLink;
    createChannel = (_: PluginLink, parent?: Serializable) => this.post(parent?.apiPathWithId() + '/plugin_link_channel', { type: _.type, url: _.url });
}
