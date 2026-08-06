import { Serializable } from '@models/_core/serializable';
import { NxAction } from '@models/_core/nx.actions';
import { getPluginLinkActions } from './plugin-link.actions';
import { Model } from '@constants/model/type-discriminators';
import { Observable } from 'rxjs';

@Model('PluginLink')
export class PluginLink extends Serializable {
    type: string = '';
    name: string = '';
    url: string = '';

    parent?: Serializable;

    static API_PATH = (): string => 'plugin_links';

    apiPath = () => (this.parent ? `${this.parent.apiPathWithId()}/plugin_links` : 'plugin_links');

    protected override buildActions(): NxAction[] { return getPluginLinkActions(this) }

    storeUnder(parent: Serializable, silent = false): Observable<this> {
        this.parent = parent;
        return this.store(undefined, silent);
    }
}
