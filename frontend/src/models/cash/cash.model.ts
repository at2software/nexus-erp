import { Serializable } from '@models/_core/serializable';
import { NxAction } from '@models/_core/nx.actions';
import { Observable } from 'rxjs';
import { getCashActions } from './cash.actions';
import { Model } from '@constants/model/type-discriminators';

@Model('Cash')
export class Cash extends Serializable {
    static API_PATH = (): string => 'cashes';

    description: string = '';
    approver: string = '';
    occured_at: string = '';
    value: number = 0;

    protected override buildActions(): NxAction[] { return getCashActions(this) }

    delete(): Observable<any> {
        return this.httpService.delete('cash/entries/' + this.id);
    }
}
