import { Service } from '@angular/core';
import { Sentinel } from '@models/sentinel/sentinel.model';
import { NexusHttpService } from '../http/http.nexus';
import { SentinelActiveGroupDto } from '@models/_core/api-response';

@Service()
export class SentinelService extends NexusHttpService<Sentinel> {
    public apiPath = 'sentinels';
    override readonly model = Sentinel;

    indexActive = () => this.aget<SentinelActiveGroupDto>('sentinels/active');
}
