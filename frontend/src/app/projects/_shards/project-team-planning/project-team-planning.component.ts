import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Nx } from '@app/nx/nx.directive';
import { NComponent } from '@shards/n/n.component';
import { AutosaveDirective } from '@directives/autosave.directive';
import { PermissionsDirective } from '@directives/permissions.directive';
import { Assignee } from '@models/assignee/assignee.model';
import { AssignmentService } from '@models/assignee/assignment.service';
import { GlobalService } from '@models/global.service';
import { Project } from '@models/project/project.model';
import { User } from '@models/user/user.model';
import { IHasAssignees } from '@interfaces/hasAssignees.interface';
import { tracked } from '@constants/tracked';
import { Company } from '@models/company/company.model';
import { NgbDropdownModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { PluginInstanceFactory } from '@models/http/plugin.instance.factory';
import { PluginInstance } from '@models/http/plugin.instance';
import { MantisPlugin } from '@models/http/plugin.mantis';
import { GitLabPlugin } from '@models/http/plugin.gitlab';
import { MattermostPlugin } from '@models/http/plugin.mattermost';
import { AvatarComponent } from '@shards/avatar/avatar.component';

@Component({
    selector: 'project-team-planning',
    templateUrl: './project-team-planning.component.html',
    styleUrls: ['./project-team-planning.component.scss'],
    standalone: true,
    imports: [PermissionsDirective, DecimalPipe, FormsModule, AutosaveDirective, AvatarComponent, Nx, NComponent, AvatarComponent, NgbDropdownModule, NgbTooltipModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectTeamPlanningComponent {
    readonly entityIn = input.required<IHasAssignees>({ alias: 'entity' });
    readonly entity = tracked(this.entityIn);

    assignees = signal<Assignee[]>([]);

    #assignmentService = inject(AssignmentService);
    #global = inject(GlobalService);
    #factory = inject(PluginInstanceFactory);
    #cdr = inject(ChangeDetectorRef);

    constructor() {
        effect(() => this.assignees.set(this.entityIn().assignees.filter((_) => _.assignee?.class == 'User')));

        effect((onCleanup) => {
            const instances = [this.mantisInstance(), this.gitInstance(), this.mattermostInstance()].filter(Boolean) as PluginInstance[];
            const subs = instances.map((inst) => inst.init.subscribe(() => this.#cdr.markForCheck()));
            onCleanup(() => subs.forEach((s) => s.unsubscribe()));
        });

        effect((onCleanup) => {
            const project = this.asProject();
            if (!project) return;
            const sub = project.projectManagerChanged.subscribe(() => this.#cdr.markForCheck());
            onCleanup(() => sub.unsubscribe());
        });
    }

    addUser(x: User) {
        const entity = this.entity();
        if (entity instanceof Project) {
            this.#assignmentService.addToProject(entity, { id: x.id, class: 'user' }).subscribe((response: Assignee) => {
                entity.assignees.push(response);
                this.assignees.set(entity.assignees.filter((_) => _.assignee?.class == 'User'));
            });
        } else if (entity instanceof Company) {
            this.#assignmentService.addToCompany(entity, { id: x.id, class: 'user' }).subscribe((response: Assignee) => {
                entity.assignees.push(response);
                this.assignees.set(entity.assignees.filter((_) => _.assignee?.class == 'User'));
            });
        }
    }

    canBeAssigned = computed(() =>
        this.#global.team.filter(
            (x) =>
                !this.entity()
                    .assignedUsers()
                    .map((a) => a.assignee.id)
                    .contains(x.id),
        ),
    );

    asProject = computed(() => {
        const _ = this.entity();
        return _ instanceof Project ? (_ as Project) : undefined;
    });

    forecastProgress = computed(() => {
        const p = this.asProject();
        if (!p || p.is_time_based) return null;
        const estimated = p.work_estimated ?? 0;
        const invested = p.hours_invested;
        const forecast = p.remainingAllocatedTime();
        const remainingBudget = Math.max(0, estimated - invested);
        const overdraft = Math.max(0, invested - estimated);
        const allocatedWithinBudget = Math.min(forecast, remainingBudget);
        const overAllocated = Math.max(0, forecast - remainingBudget);
        const total = Math.max(estimated, invested + forecast, 0.001);
        return {
            investedPct: (Math.min(invested, estimated) / total) * 100,
            allocatedPct: (allocatedWithinBudget / total) * 100,
            overdraftPct: (overdraft / total) * 100,
            overAllocatedPct: (overAllocated / total) * 100,
            invested,
            overdraft,
            forecast,
            estimated,
        };
    });

    forecastWarning = computed(() => {
        const p = this.asProject();
        if (!p || p.is_time_based || !p.state?.isRunning()) return false;
        const estimated = p.work_estimated ?? 0;
        if (estimated <= 0) return false;
        return (p.hours_invested + p.remainingAllocatedTime()) / estimated < 0.5;
    });

    isProjectManager = computed(() => this.#global.user?.hasRole('project_manager') ?? false);

    mantisInstance = computed(() => this.#factory.instancesFor(this.entity(), MantisPlugin));
    gitInstance = computed(() => this.#factory.instancesFor(this.entity(), GitLabPlugin));
    mattermostInstance = computed(() => this.#factory.instancesFor(this.entity(), MattermostPlugin));

    openMantisLink(event: Event) {
        event.preventDefault();
        event.stopPropagation();
        const inst = this.mantisInstance();
        if (inst) window.open(inst.getHref(), '_blank');
    }

    openGitLink(event: Event) {
        event.preventDefault();
        event.stopPropagation();
        const inst = this.gitInstance();
        if (inst) window.open(inst.getHref(), '_blank');
    }

    openMattermostLink(event: Event) {
        event.preventDefault();
        event.stopPropagation();
        const inst = this.mattermostInstance();
        if (inst) window.open(inst.getHref(), '_blank');
    }

    roundHours = (value: number) => Math.round(value * 10) / 10;
}
