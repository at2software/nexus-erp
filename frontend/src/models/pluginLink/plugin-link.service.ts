import { Injectable } from '@angular/core';
import { PluginLink } from './plugin-link.model';
import { NexusHttpService } from './../http/http.nexus';
import { Serializable } from '@models/serializable';

export type PluginLinkType = 'mattermost' | 'git';

@Injectable({ providedIn: 'root' })
export class PluginLinkService extends NexusHttpService<PluginLink> {
    apiPath = 'plugin_links';
    TYPE = () => PluginLink;
    store = (_: PluginLink, parent?: Serializable) => this.post(parent?.apiPathWithId() + '/plugin_links', { type: _.type, url: _.url });
    createChannel = (_: PluginLink, parent?: Serializable) => this.post(parent?.apiPathWithId() + '/plugin_link_channel', { type: _.type, url: _.url });
}
