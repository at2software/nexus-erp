import { Injectable } from '@angular/core';
import { Vacation } from './vacation.model';
import { NexusHttpService } from '../http/http.nexus';
import { VacationGrant } from './vacation-grant.model';
import { User } from '../user/user.model';
import { NxGlobal } from 'src/app/nx/nx.global';
import { map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class VacationService extends NexusHttpService<Vacation> {
    
  apiPath = 'vacations'
  
  TYPE = () => Vacation

  indexGrants           = (user:User) => this.aget(user.getApiPathWithId() + '/vacation_grants', { }, VacationGrant).pipe(map((grants:VacationGrant[]) => {
      grants.forEach(grant => grant.vacations.forEach(vacation => vacation.grant = grant))
      return grants
  }))
  indexRequests         = (user:User) => this.aget(user.getApiPathWithId() + '/vacation_requests', { }, Vacation)
  indexAbsences         = (user:User) => this.aget(user.getApiPathWithId() + '/vacation_absences', { }, Vacation)
  indexPendingRequests  = () => this.aget('vacations/requests', { }, Vacation)
  indexSickNotes        = () => this.aget('vacations/sick-notes', { }, Vacation)
  show                  = (id:string) => this.get('vacations/' + id)
  storeManual           = (v:Vacation) => this.post('vacations/manual', NxGlobal.payloadFor(v, v.constructor))
  storeSickNote         = (v:Vacation) => this.post('vacations/sick-notes', NxGlobal.payloadFor(v, v.constructor))
  storeSickNoteForOther = (payload:any) => this.post('vacations/sick-notes', payload)
}
