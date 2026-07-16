import { Injectable } from '@angular/core';
import { NexusHttpService } from '../http/http.nexus';
import { VacationGrant } from './vacation-grant.model';

@Injectable({ providedIn: 'root' })
export class VacationGrantService extends NexusHttpService<VacationGrant> {
    apiPath = 'vacation_grants';
    override readonly model = VacationGrant;
}
