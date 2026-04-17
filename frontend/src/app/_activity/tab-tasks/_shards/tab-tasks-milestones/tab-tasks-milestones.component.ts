import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { NexusModule } from '@app/nx/nexus.module';
import { Milestone } from '@models/milestones/milestone.model';
import { MilestoneService } from '@models/milestones/milestone.service';
import { Project } from '@models/project/project.model';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { TabTasksBaseComponent } from '../tab-tasks-base.component';

@Component({
    selector: 'tab-tasks-milestones',
    templateUrl: './tab-tasks-milestones.component.html',
    standalone: true,
    imports: [CommonModule, NexusModule, NgbTooltipModule]
})
export class TabTasksMilestonesComponent extends TabTasksBaseComponent {

    milestonesOverdue       : Milestone[] = []
    milestonesNeedStarting  : Milestone[] = []
    milestonesRunning       : Milestone[] = []
    milestonesNeedAssignment: Milestone[] = []
    milestonesNoDuration    : Milestone[] = []
    projectsNoCoverage      : Project[] = []

    #milestoneService = inject(MilestoneService)

    override reload() {
        this.#milestoneService.indexUserMilestones(this.global.user?.id || '').pipe(takeUntilDestroyed(this.destroyRef)).subscribe(data => {
            this.milestonesOverdue       = []
            this.milestonesNeedStarting  = []
            this.milestonesRunning       = []
            this.milestonesNoDuration    = []
            data.forEach((group) => {
                const project = Project.fromJson((group as any).project)
                group.milestones.forEach((ms: any) => {
                    const milestone = Milestone.fromJson(ms.milestone)
                    milestone.project = project
                    const hasNoDuration = (!milestone.workload_hours || milestone.workload_hours === 0) &&
                        (!milestone.invoice_items || milestone.invoice_items.length === 0) &&
                        !milestone.project?.is_time_based
                    if (hasNoDuration && milestone.state !== 2) this.milestonesNoDuration.push(milestone)
                    if (milestone.state === 1 && milestone.due_at && new Date(milestone.due_at) < new Date()) {
                        this.milestonesOverdue.push(milestone)
                    } else if (milestone.state === 0 && milestone.started_at && new Date(milestone.started_at) <= new Date()) {
                        this.milestonesNeedStarting.push(milestone)
                    } else if (milestone.state === 1) {
                        this.milestonesRunning.push(milestone)
                    }
                })
            })
            this.countChanged.emit(this.milestonesOverdue.length)
        })
        this.#milestoneService.indexPmMilestones(this.global.user?.id || '').pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data: any) => {
            this.milestonesNeedAssignment = []
            this.projectsNoCoverage = data.projectsNoCoverage || []
            ;(data.milestones || []).forEach((group: any) => {
                const project = Project.fromJson(group.project)
                group.milestones.forEach((ms: any) => {
                    const milestone = Milestone.fromJson(ms.milestone)
                    milestone.project = project
                    if (milestone.user_id === this.global.user?.id) return
                    if (milestone.user_id === null) {
                        this.milestonesNeedAssignment.push(milestone)
                        return
                    }
                    if (milestone.state === 1 && milestone.due_at && new Date(milestone.due_at) < new Date()) {
                        this.milestonesOverdue.push(milestone)
                    } else if (milestone.state === 0 && milestone.started_at && new Date(milestone.started_at) <= new Date()) {
                        this.milestonesNeedStarting.push(milestone)
                    }
                })
            })
        })
    }
}
