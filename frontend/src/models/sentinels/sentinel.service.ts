import { Injectable } from '@angular/core';
import { Dictionary } from '@constants/constants';
import { Sentinel } from '@models/sentinels/sentinel.model';
import { NexusHttpService } from '../http/http.nexus';
import { SentinelActiveGroup } from '@models/api-response';

@Injectable({ providedIn: 'root' })
export class SentinelService extends NexusHttpService<Sentinel> {
    public apiPath = 'sentinels';
    override readonly model = Sentinel;

    indexActive = () => this.aget<SentinelActiveGroup>('sentinels/active');
    store = (item: Sentinel) => this.post('sentinels', item);
    update = (item: Sentinel, data?: Dictionary) => this.put(`sentinels/${item.id}`, data ?? item);
}
