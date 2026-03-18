import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnChanges } from '@angular/core';
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
        NgbTooltipModule,
    ]
})
export class ProjectTeamPlanningComponent implements OnChanges {
    
    assignees:Assignee[] = []

    @Input() entity: IHasAssignees

    #assignmentService = inject(AssignmentService)
    #global = inject(GlobalService)
    #factory = inject(PluginInstanceFactory)

    ngOnChanges(changes?: any) {
        if ('entity' in changes) {
            this.assignees = this.entity.assignees.filter(_ => _.assignee?.class == 'User')
        }
    }

    addUser(x: User) {
        if (this.entity instanceof Project) {
            this.#assignmentService.addToProject(this.entity, { id: x.id, class: 'user' }).subscribe((response: Assignee) => {
                this.entity.assignees.push(response)
            })
        } else if (this.entity instanceof Company) {
            this.#assignmentService.addToCompany(this.entity, { id: x.id, class: 'user' }).subscribe((response: Assignee) => {
                this.entity.assignees.push(response)
            })
        }
    }
    canBeAssigned = () => this.#global.team.filter(x => !this.entity.getAssignedUsers().map(a => a.assignee.id).contains(x.id))
    
    isProject = () => this.entity instanceof Project
    asProject = () => this.entity as Project
        
    getMantisInstance(): MantisPlugin | undefined {
        return this.#factory.instancesFor(this.entity, undefined) as MantisPlugin | undefined
    }

    getMantisUserId(assignee: Assignee): string | undefined {
        return assignee.assignee?.class === 'User' ? (assignee.assignee as any).getUserIdForPlugin?.('X-NEXUS-MANTISBT') : undefined
    }

    getMantisIconClass(assignee: Assignee): string {
        return assignee.assignee?.class === 'User' ? (assignee.assignee as any).getInstanceIconClass?.(this.getMantisInstance()) || '' : ''
    }

    getMantisTooltip(assignee: Assignee): string {
        return assignee.assignee?.class === 'User' ? (assignee.assignee as any).getInstanceTooltip?.(this.getMantisInstance()) || '' : ''
    }

    openMantisProfile(assignee: Assignee, event: Event) {
        event.preventDefault()
        event.stopPropagation()
        if (assignee.assignee?.class === 'User') {
            (assignee.assignee as any).openProfile?.(MantisPlugin)
        }
    }

    // Git integration methods
    getGitInstance(): GitLabPlugin | undefined {
        return this.#factory.instancesFor(this.entity, undefined) as GitLabPlugin | undefined
    }

    getGitUsername(assignee: Assignee): string | undefined {
        return assignee.assignee?.class === 'User' ? (assignee.assignee as any).getUserIdForPlugin?.('X-NEXUS-GIT') : undefined
    }

    getGitIconClass(assignee: Assignee): string {
        return assignee.assignee?.class === 'User' ? (assignee.assignee as any).getInstanceIconClass?.(this.getGitInstance()) || '' : ''
    }

    getGitTooltip(assignee: Assignee): string {
        return assignee.assignee?.class === 'User' ? (assignee.assignee as any).getInstanceTooltip?.(this.getGitInstance()) || '' : ''
    }

    openGitProfile(assignee: Assignee, event: Event) {
        event.preventDefault()
        event.stopPropagation()
        if (assignee.assignee?.class === 'User') {
            (assignee.assignee as any).openProfile?.(GitLabPlugin)
        }
    }

    // Mattermost integration methods
    getMattermostInstance(): any | undefined {
        return this.#factory.instancesFor(this.entity, undefined)
    }

    getMattermostUserId(assignee: Assignee): string | undefined {
        return assignee.assignee?.class === 'User' ? (assignee.assignee as any).getUserIdForPlugin?.('X-NEXUS-MATTERMOST') : undefined
    }

    getMattermostIconClass(assignee: Assignee): string {
        return assignee.assignee?.class === 'User' ? (assignee.assignee as any).getInstanceIconClass?.(this.getMattermostInstance()) || '' : ''
    }

    getMattermostTooltip(assignee: Assignee): string {
        return assignee.assignee?.class === 'User' ? (assignee.assignee as any).getInstanceTooltip?.(this.getMattermostInstance()) || '' : ''
    }

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
}
