import { ObserverTrigger } from '@enums/observer-trigger';
import { Serializable } from '@models/_core/serializable';
import { NxAction } from '@models/_core/nx.actions';
import { getSentinelActions } from './sentinel.actions';
import { Model } from '@constants/model/type-discriminators';

@Model('Sentinel')
export class Sentinel extends Serializable {
    static API_PATH = (): string => 'sentinels';

    protected override buildActions(): NxAction[] { return getSentinelActions(this) }

    name: string = '';
    table_name: string = '';
    trigger_variable: string = '';
    trigger: number = ObserverTrigger.Disabled;
    primaryLabel?: string;
    secondaryLabel?: string;
    condition: string = '';
    result: string = '';

    get scss(): string {
        switch (this.trigger) {
            case ObserverTrigger.Always:
                return 'primary';
            case ObserverTrigger.Disabled:
                return 'dark';
            case ObserverTrigger.OnCreated:
                return 'green';
            case ObserverTrigger.OnDeleted:
                return 'red';
            case ObserverTrigger.OnUpdated:
                return 'yellow';
            case ObserverTrigger.Once:
                return 'orange';
        }
        return 'pink';
    }
    triggerName = (): string => ObserverTrigger[this.trigger];
}
