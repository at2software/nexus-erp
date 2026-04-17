import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NexusModule } from '@app/nx/nexus.module';
import { AutosaveDirective } from '@directives/autosave.directive';
import { PermissionsDirective } from '@directives/permissions.directive';
import { Assignee } from '@models/assignee/assignee.model';
import { AssignmentService } from '@models/assignee/assignment.service';
import { GlobalService } from '@models/global.service';
import { Project } from '@models/project/project.model';
import { User } from '@models/user/user.model';
import { IHasAssignees } from 'src/interfaces/hasAssignees.interface';
import { Company } from '@models/company/company.model';
import { NgbDropdownModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { PluginInstanceFactory } from '@models/http/plugin.instance.factory';
import { MantisPlugin } from '@models/http/plugin.mantis';
import { GitLabPlugin } from '@models/http/plugin.gitlab';
import { MattermostPlugin } from '@models/http/plugin.mattermost';
import { AvatarComponent } from '@shards/avatar/avatar.component';

@Component({
    selector: 'project-team-planning',
    templateUrl: './project-team-planning.component.html',
    styleUrls: ['./project-team-planning.component.scss'],
    standalone: true,
    imports: [
    PermissionsDirective,
    CommonModule,
    FormsModule,
    AutosaveDirective,
    AvatarComponent,
    NexusModule,
    NgbDropdownModule,
    NgbTooltipModule
]
})
export class ProjectTeamPlanningComponent {
    
    assignees:Assignee[] = []

    entity = input.required<IHasAssignees>()

    #assignmentService = inject(AssignmentService)
    #global = inject(GlobalService)
    #factory = inject(PluginInstanceFactory)

    constructor() {
        effect(() => {
            this.assignees = this.entity().assignees.filter(_ => _.assignee?.class == 'User')
        })
    }

    addUser(x: User) {
        const entity = this.entity()
        if (entity instanceof Project) {
            this.#assignmentService.addToProject(entity, { id: x.id, class: 'user' }).subscribe((response: Assignee) => {
                entity.assignees.push(response)
                this.assignees = entity.assignees.filter(_ => _.assignee?.class == 'User')
            })
        } else if (entity instanceof Company) {
            this.#assignmentService.addToCompany(entity, { id: x.id, class: 'user' }).subscribe((response: Assignee) => {
                entity.assignees.push(response)
                this.assignees = entity.assignees.filter(_ => _.assignee?.class == 'User')
            })
        }
    }
    canBeAssigned = computed(() => this.#global.team.filter(x => !this.entity().getAssignedUsers().map(a => a.assignee.id).contains(x.id)))
    
    asProject = computed(() => { const _ = this.entity(); return _ instanceof Project ? _ as Project : undefined })

    forecastProgress = computed(() => {
        const p = this.asProject()
        if (!p || p.is_time_based) return null
        const estimated = p.work_estimated ?? 0
        const invested = p.hours_invested
        const forecast = p.getForecastSum()
        const remainingBudget = Math.max(0, estimated - invested)
        const overdraft = Math.max(0, invested - estimated)
        const allocatedWithinBudget = Math.min(forecast, remainingBudget)
        const overAllocated = Math.max(0, forecast - remainingBudget)
        const total = Math.max(estimated, invested + forecast, 0.001)
        return {
            investedPct: Math.min(invested, estimated) / total * 100,
            allocatedPct: allocatedWithinBudget / total * 100,
            overdraftPct: overdraft / total * 100,
            overAllocatedPct: overAllocated / total * 100,
            invested,
            overdraft,
            forecast,
            estimated,
        }
    })

    forecastWarning = computed(() => {
        const p = this.asProject()
        if (!p || p.is_time_based || !p.state?.isRunning()) return false
        const estimated = p.work_estimated ?? 0
        if (estimated <= 0) return false
        return (p.hours_invested + p.getForecastSum()) / estimated < 0.5
    })        
    getMantisInstance = computed(() => this.#factory.instancesFor(this.entity(), undefined) as MantisPlugin | undefined)

    getMantisUserId = (assignee: Assignee): string | undefined => assignee.assignee?.class === 'User' ? (assignee.assignee as any).getUserIdForPlugin?.('X-NEXUS-MANTISBT') : undefined
    getMantisIconClass = (assignee: Assignee): string => assignee.assignee?.class === 'User' ? (assignee.assignee as any).getInstanceIconClass?.(this.getMantisInstance()) || '' : ''
    getMantisTooltip = (assignee: Assignee): string => assignee.assignee?.class === 'User' ? (assignee.assignee as any).getInstanceTooltip?.(this.getMantisInstance()) || '' : ''

    openMantisProfile(assignee: Assignee, event: Event) {
        event.preventDefault()
        event.stopPropagation()
        if (assignee.assignee?.class === 'User') {
            (assignee.assignee as any).openProfile?.(MantisPlugin)
        }
    }

    // Git integration methods
    getGitInstance = computed(() => this.#factory.instancesFor(this.entity(), undefined) as GitLabPlugin | undefined)
    getGitUsername = (assignee: Assignee): string | undefined => assignee.assignee?.class === 'User' ? (assignee.assignee as any).getUserIdForPlugin?.('X-NEXUS-GIT') : undefined
    getGitIconClass = (assignee: Assignee): string => assignee.assignee?.class === 'User' ? (assignee.assignee as any).getInstanceIconClass?.(this.getGitInstance()) || '' : ''
    getGitTooltip = (assignee: Assignee): string => assignee.assignee?.class === 'User' ? (assignee.assignee as any).getInstanceTooltip?.(this.getGitInstance()) || '' : ''

    openGitProfile(assignee: Assignee, event: Event) {
        event.preventDefault()
        event.stopPropagation()
        if (assignee.assignee?.class === 'User') {
            (assignee.assignee as any).openProfile?.(GitLabPlugin)
        }
    }

    // Mattermost integration methods
    getMattermostInstance = computed(() => this.#factory.instancesFor(this.entity(), undefined) as any | undefined)
    getMattermostUserId = (assignee: Assignee): string | undefined => assignee.assignee?.class === 'User' ? (assignee.assignee as any).getUserIdForPlugin?.('X-NEXUS-MATTERMOST') : undefined
    getMattermostIconClass = (assignee: Assignee): string => assignee.assignee?.class === 'User' ? (assignee.assignee as any).getInstanceIconClass?.(this.getMattermostInstance()) || '' : ''
    getMattermostTooltip = (assignee: Assignee): string => assignee.assignee?.class === 'User' ? (assignee.assignee as any).getInstanceTooltip?.(this.getMattermostInstance()) || '' : ''

    openMattermostProfile(assignee: Assignee, event: Event) {
        event.preventDefault()
        event.stopPropagation()
        if (assignee.assignee?.class === 'User') {
            (assignee.assignee as any).openProfile?.(MattermostPlugin)
        }
    }

    roundHours(value: number): number {
        return Math.round(value * 10) / 10
    }

    get isProjectManager() { return this.#global.user?.hasRole('project_manager') ?? false }
}
