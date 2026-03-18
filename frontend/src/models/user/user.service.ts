import { Injectable, inject } from '@angular/core';
import { User } from 'src/models/user/user.model';
import { GlobalService } from '../global.service';
import { NexusHttpService } from '../http/http.nexus';
import { VacationGrant } from '../vacation/vacation-grant.model';
import { Focus } from '../focus/focus.model';

@Injectable({ providedIn: 'root' })
export class UserService extends NexusHttpService<User> {

    override apiPath = 'users'
    override TYPE = () => User

    #global = inject(GlobalService)

    login = (email: string, password: string) => this.post('login', { email: email, password: password }, Object)
    create = (data: { name?: string, first_name?: string, family_name?: string, email: string, password: string, employment?: { type: string, hpw: number, started_at: string } }) => this.post('users', data, Object)
    resetPassword = (userId: string, password: string) => this.post(`users/${userId}/reset-password`, { password }, Object)

    encrypt = (key:string, object:any, id:string|null = null) => this.post(`users/${this.#global.user?.id}/encrypt`, { key:key, data: this.#global.user?.keyPair?.publicKey.encrypt(JSON.stringify(object)), id:id } )

    show = (id:string) => this.get(`users/${id}`)
    showVacationStats = (user:User) => this.aget(user.getApiPathWithId() + '/vacation_stats', VacationGrant)
    showProjectLoad = (user:User) => this.get(user.getApiPathWithId() + '/project_load', {}, Object)
    showFoci30DStats = (user:User) => this.aget(user.getApiPathWithId() + '/show-foci-30d', {}, Focus)
    showTimeBasedEmploymentInfo = (user:User) => this.get(user.getApiPathWithId() + '/time-based-employment', {}, Object)
    addTbe = (user:User, data:{ paid_at:string, raw:number, vacation:number }) => this.post(user.getApiPathWithId() + '/time-based-employment', data, Object)
    showDailyWorkload = (user:User, start?:string, end?:string) => {
        const params: Record<string, string> = {}
        if (start) params['start'] = start
        if (end) params['end'] = end
        return this.get(user.getApiPathWithId() + '/daily-workload', params, Object)
    }
} 
