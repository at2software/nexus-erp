import { Injectable } from '@angular/core';
import { Vacation } from './vacation.model';
import { NexusHttpService } from '../http/http.nexus';
import { VacationGrant } from './vacation-grant.model';

@Injectable({ providedIn: 'root' })
export class VacationGrantService extends NexusHttpService<Vacation> {
    
  apiPath = 'vacation_grants'
  TYPE = () => VacationGrant
  
}
