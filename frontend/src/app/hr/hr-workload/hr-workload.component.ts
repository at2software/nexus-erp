import { Component, inject, Input, OnChanges } from '@angular/core';
import { Assignee, I18N_REMOVE_FROM_TEAM, T_ASSIGNEE_TARGET } from 'src/models/assignee/assignee.model';
import { Project } from 'src/models/project/project.model';
import { User } from 'src/models/user/user.model';
import { UserService } from 'src/models/user/user.service';
import moment, { Moment } from 'moment';
import { ActionEmitterType } from 'src/app/nx/nx.directive';
import { Color } from 'src/constants/Color';
import { ProjectState } from '@models/project/project-state.model';
import { NxGlobal } from '@app/nx/nx.global';
import { Company } from '@models/company/company.model';
import { REFLECTION } from '@constants/constants';
import { CommonModule } from '@angular/common';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { NexusModule } from '@app/nx/nexus.module';
import { FormsModule } from '@angular/forms';
import { PermissionsDirective } from '@directives/permissions.directive';
import { IHasFoci } from '@models/focus/hasFoci.interface';
import { RouterModule } from '@angular/router';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';

interface TLABEL { label:string, percent:number }

interface TWeekly { type:string, id:string, link?:string }
type TBlock = TWeekly & { name: string, left:number, width: number, days:number }
interface TData {
    user            : User,
    hpw             : number,
    remaining_hpw   : number,
    subscriptions   : IHasFoci[],
    weekly_ids      : TWeekly[],
    timeline_planned: TBlock[],
    timeline_leaves : TBlock[]
}

const D_START = moment().startOf('day')
const D_END = D_START.clone().add(60, 'days').endOf('day')

@Component({
    selector: 'hr-workload',
    templateUrl: './hr-workload.component.html',
    styleUrls: ['./hr-workload.component.scss'],
    standalone: true,
    imports: [CommonModule, NgbTooltipModule, NexusModule, FormsModule, PermissionsDirective, RouterModule, EmptyStateComponent]
})
export class HrWorkloadComponent implements OnChanges {
    
    @Input() user:User
    @Input() title?:string = undefined
    @Input() onlyChart:boolean = false
    @Input() chartHeight:number = 160 // Default height in pixels

    data: TData
    isError = false
    #canSetWeeklyCache = new Map<string, boolean>()

    monthLabels:TLABEL[] = [{label: '', percent:0}, {label: '', percent:0}, {label: '', percent:0}]

    filterIcons = {
        prepared: Project.fromJson({ state: ProjectState.stateFor(0) }),
        running: Project.fromJson({ state: ProjectState.stateFor(1) }),
        internal: Project.fromJson({ state: ProjectState.stateFor(1), is_internal: true }),
    }

    #userService = inject(UserService)
    
    ngOnChanges(changes:any) {
        if ('user' in changes && this.user) {
            this.reload()
        }
    }

    reload() {
        if (!this.user) return
        const getLink = (_:TWeekly) => _.type === 'Project' ? `/projects/${_.id}` : _.type === 'Company' ? `/customers/${_.id}` : undefined
        this.isError = false
        this.#userService.showProjectLoad(this.user).subscribe({
            next: (response: any) => {
                if (!response?.subscriptions) return
                const data = response as TData
                data.user = User.fromJson(data.user)
                data.subscriptions = data.subscriptions.map(x => REFLECTION(x))
                data.timeline_planned.forEach(_ => _.link = getLink(_))
                this.data = data
                this.#canSetWeeklyCache.clear()
                this.#populateCanSetWeeklyCache()
            },
            error: () => { this.isError = true }
        })
        for (const i in this.monthLabels) {
            const month = D_START.clone().add(i, 'months').startOf('month').add(1, 'month')
            this.monthLabels[i].label = month.format('MMM')
            this.monthLabels[i].percent = this.offsetFor(month)
        }
    }

    onContextMenuAction ($event:ActionEmitterType, _:T_ASSIGNEE_TARGET) {
        if ($event.action.title === I18N_REMOVE_FROM_TEAM) {
            this.user.active_projects.remove(_)
        }
    }

    updateAssignment = (_:Assignee) => { _.update().subscribe() }

    offsetFor          = (date:Moment) => date.diff(D_START, 'seconds') / D_END.diff(D_START, 'seconds')
    isProject = (_:any) => _ instanceof Project
    asProject = (_:any) => _ instanceof Project ? _ as Project : undefined
    markerFor = (assignee: Assignee) => {
        const diff = Math.abs(assignee.hours_weekly - assignee.avg_hpd * 5)
        if (diff < 0.5) return undefined
        if (diff < 1) return 'yellow'
        if (diff < 1.5) return 'orange'
        return 'red'
    }
    markerClassFor = (assignee: Assignee) => {
        const marker = this.markerFor(assignee)
        if (!marker) return ''
        return `marker marker-${marker}`
    }
    canSetWeekly = (_:any): boolean => {
        if (_ instanceof Project) {
            if (_.company_id == NxGlobal.ME_ID) return true
            return !!_.is_time_based
        } 
        if (_.is('Company')) {
            return _.id == NxGlobal.ME_ID
        }
        return false
    }
    getWeekly = () => this.data.weekly_ids.map(_ => this.getSubscriptionFor(_))
    getSubscriptionFor = (_:TWeekly) => this.data.subscriptions.find(x => x.class == _.type && x.id == '' + _.id)!
    colorFor = (_:TBlock) => this.colorForSub(this.getSubscriptionFor(_))
    colorForSub = (sub:IHasFoci) => {
        if (sub instanceof Project) return sub.color()
        if (sub instanceof Company) {
            if (sub.id == NxGlobal.ME_ID) return Color.fromVar('dark')
            return Color.uniqueColorFromString(sub.name)
        }
        return ''
    }
    stripesForSub = (sub:IHasFoci) => {
        if (sub instanceof Project && sub.company_id == NxGlobal.ME_ID) return true
        if (sub instanceof Company && sub.id == NxGlobal.ME_ID) return true
        return false
    }

    trackBySubscription = (_index: number, item: IHasFoci) => `${item.class}-${item.id}`

    #populateCanSetWeeklyCache() {
        if (!this.data?.subscriptions) return
        for (const sub of this.data.subscriptions) {
            const key = this.trackBySubscription(0, sub)
            this.#canSetWeeklyCache.set(key, this.canSetWeekly(sub))
        }
    }

    canSetWeeklyCached = (item: IHasFoci) => {
        const key = this.trackBySubscription(0, item)
        return this.#canSetWeeklyCache.get(key) ?? false
    }

}
