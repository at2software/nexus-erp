import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { NgbCollapseModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { NComponent } from '@shards/n/n.component';
import { Milestone } from '@models/milestones/milestone.model';
import { Project } from '@models/project/project.model';
import { MilestonesGroup } from '@models/milestones/api.milestone-group';
import { ExtIssueBacklogItem } from '../external-issues/ext-issue-backlog.service';

export type BacklogDragItem = { kind: 'milestone'; milestone: Milestone } | { kind: 'issue'; issue: ExtIssueBacklogItem };

/** "To plan" rail: unconfigured/undated milestones plus live external issues, all draggable onto the capacity calendar. */
@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'planner-backlog',
    templateUrl: './planner-backlog.component.html',
    styleUrls: ['./planner-backlog.component.scss'],
    imports: [CdkDrag, CdkDropList, NgbCollapseModule, NgbTooltipModule, AvatarComponent, NComponent],
})
export class PlannerBacklogComponent {
    unconfiguredMilestones = input<Milestone[]>([]);
    undatedMilestones = input<Milestone[]>([]);
    projectGroups = input<MilestonesGroup[]>([]);

    externalIssues = input<ExtIssueBacklogItem[]>([]);
    externalIssuesLoading = input<boolean>(false);

    addMilestone = output<Project>();

    readonly projects = computed(() => this.projectGroups().map((g) => g.project));

    milestoneItem = (milestone: Milestone): BacklogDragItem => ({ kind: 'milestone', milestone });
    issueItem = (issue: ExtIssueBacklogItem): BacklogDragItem => ({ kind: 'issue', issue });

    openIssue(issue: ExtIssueBacklogItem, event: Event): void {
        event.stopPropagation();
        issue.task.httpService.open(issue.task);
    }

    trackById = (_index: number, _: { id: string }): string => _.id;
}
