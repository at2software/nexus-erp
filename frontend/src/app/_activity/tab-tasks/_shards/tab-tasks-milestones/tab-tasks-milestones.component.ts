import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgTemplateOutlet } from '@angular/common';
import { Nx } from '@app/nx/nx.directive';
import { NComponent } from '@shards/n/n.component';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { Milestone } from '@models/milestones/milestone.model';
import { MilestoneService } from '@models/milestones/milestone.service';
import { Project } from '@models/project/project.model';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { TabTasksBaseComponent } from '../tab-tasks-base.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'tab-tasks-milestones',
    templateUrl: './tab-tasks-milestones.component.html',
    imports: [NgTemplateOutlet, Nx, NComponent, AvatarComponent, NgbTooltipModule],
})
export class TabTasksMilestonesComponent extends TabTasksBaseComponent {
    milestonesOverdue = signal<Milestone[]>([]);

    milestonesNeedStarting = signal<Milestone[]>([]);
    milestonesRunning = signal<Milestone[]>([]);
    milestonesNeedAssignment = signal<Milestone[]>([]);
    milestonesNoDuration = signal<Milestone[]>([]);
    projectsNoCoverage = signal<Project[]>([]);

    #milestoneService = inject(MilestoneService);

    override reload() {
        this.#milestoneService
            .indexUserMilestones(this.global.user?.id || '')
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((data) => {
                const overdue: Milestone[] = [];
                const needStarting: Milestone[] = [];
                const running: Milestone[] = [];
                const noDuration: Milestone[] = [];
                data.forEach((group) => {
                    const project = group.project;
                    group.milestones.forEach((milestone) => {
                        milestone.project = project;
                        const hasNoDuration = (!milestone.workload_hours || milestone.workload_hours === 0) && (!milestone.invoice_items || milestone.invoice_items.length === 0) && !milestone.project?.is_time_based;
                        if (hasNoDuration && milestone.state !== 2) noDuration.push(milestone);
                        if (milestone.state === 1 && milestone.due_at && new Date(milestone.due_at) < new Date()) {
                            overdue.push(milestone);
                        } else if (milestone.state === 0 && milestone.started_at && new Date(milestone.started_at) <= new Date()) {
                            needStarting.push(milestone);
                        } else if (milestone.state === 1) {
                            running.push(milestone);
                        }
                    });
                });
                this.milestonesOverdue.set(overdue);
                this.milestonesNeedStarting.set(needStarting);
                this.milestonesRunning.set(running);
                this.milestonesNoDuration.set(noDuration);
                this.countChanged.emit(overdue.length);
            });
        this.#milestoneService
            .indexPmMilestones(this.global.user?.id || '')
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((data) => {
                const needAssignment: Milestone[] = [];
                data.milestones.forEach((group) => {
                    group.milestones.forEach((milestone) => {
                        milestone.project = group.project;
                        if (milestone.user_id === this.global.user?.id) return;
                        if (milestone.user_id === null) {
                            needAssignment.push(milestone);
                            return;
                        }
                        if (milestone.state === 1 && milestone.due_at && new Date(milestone.due_at) < new Date()) {
                            this.milestonesOverdue.update((arr) => [...arr, milestone]);
                        } else if (milestone.state === 0 && milestone.started_at && new Date(milestone.started_at) <= new Date()) {
                            this.milestonesNeedStarting.update((arr) => [...arr, milestone]);
                        }
                    });
                });
                this.milestonesNeedAssignment.set(needAssignment);
                this.projectsNoCoverage.set(data.projectsNoCoverage);
            });
    }
}
