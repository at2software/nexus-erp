import { Injectable } from '@angular/core';
import { Dictionary } from '@constants/constants';
import { Vacation } from './vacation.model';
import { NexusHttpService } from '../http/http.nexus';
import { VacationGrant } from './vacation-grant.model';
import { User } from '../user/user.model';
import { NxGlobal } from '@app/nx/nx.global';
import { map } from 'rxjs';
import { Holiday } from '@models/api-response';

@Injectable({ providedIn: 'root' })
export class VacationService extends NexusHttpService<Vacation> {
    apiPath = 'vacations';
    override readonly model = Vacation;

    indexGrants = (user: User) =>
        this.aget(user.apiPathWithId() + '/vacation_grants', {}, VacationGrant).pipe(
            map((grants: VacationGrant[]) => {
                grants.forEach((grant) => grant.vacations.forEach((vacation) => (vacation.grant = grant)));
                return grants;
            }),
        );
    indexHolidays = () => this.aget<Holiday>('vacations/holidays');
    indexRequests = (user: User) => this.aget(user.apiPathWithId() + '/vacation_requests', {}, Vacation);
    indexAbsences = (user: User) => this.aget(user.apiPathWithId() + '/vacation_absences', {}, Vacation);
    indexPendingRequests = () => this.aget('vacations/requests', {}, Vacation);
    indexSickNotes = () => this.aget('vacations/sick-notes', {}, Vacation);
    storeManual = (v: Vacation) => this.post('vacations/manual', NxGlobal.payloadFor(v, v.constructor as typeof Vacation));
    storeSickNote = (v: Vacation) => this.post('vacations/sick-notes', NxGlobal.payloadFor(v, v.constructor as typeof Vacation));
    storeSickNoteForOther = (payload: Dictionary) => this.post('vacations/sick-notes', payload);
}
