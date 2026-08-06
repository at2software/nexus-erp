import { Service } from '@angular/core';
import { NexusHttpService } from '../http/http.nexus';
import { VacationGrant } from './vacation-grant.model';

@Service()
export class VacationGrantService extends NexusHttpService<VacationGrant> {
    apiPath = 'vacation_grants';
    override readonly model = VacationGrant;
}
