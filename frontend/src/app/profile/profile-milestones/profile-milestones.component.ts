import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { GlobalService } from '@models/global.service';
import { MilestoneService } from '@models/milestone/milestone.service';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { Milestone } from '@models/milestone/milestone.model';
import { Project } from '@models/project/project.model';
import { InputModalService } from '@app/_modals/modal-input/modal-input.service';
import { UserService } from '@models/user/user.service';
import { ProjectService } from '@models/project/project.service';
import { Toast } from '@shards/toast/toast';
import { SpinnerComponent } from '@shards/spinner/spinner.component';
import { dayjs } from '@constants/date/dates';
import { modelListResource, modelResource } from '@models/http/model-resource';
import { mapWorkloadDto } from '@app/hr/workload-dto.mapper';
import { ModalBaseService } from '@app/_modals/modal-base-service';
import { ModalEditMilestoneComponent } from '@app/_modals/modal-edit-milestone/modal-edit-milestone.component';
import { CdkDropListGroup } from '@angular/cdk/drag-drop';
import { CapacityCalendarComponent, CapacityCalendarDrop, MilestoneReschedule } from './capacity-calendar/capacity-calendar.component';
import { PlannerBacklogComponent, BacklogDragItem } from './planner-backlog/planner-backlog.component';
import { ExtIssueBacklogItem, ExtIssueBacklogService } from './external-issues/ext-issue-backlog.service';
import { ModalConvertIssueComponent } from './external-issues/modal-convert-issue/modal-convert-issue.component';
import { ModalAddMilestoneComponent } from './capacity-calendar/modal-add-milestone/modal-add-milestone.component';

const HORIZON_MONTHS = 3;

@Component({
    selector: 'profile-milestones',
    templateUrl: './profile-milestones.component.html',
    styleUrls: ['./profile-milestones.component.scss'],
    imports: [ToolbarComponent, SpinnerComponent, CapacityCalendarComponent, PlannerBacklogComponent, CdkDropListGroup],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileMilestonesComponent {
    global = inject(GlobalService);
    #milestoneService = inject(MilestoneService);
    #userService = inject(UserService);
    #projectService = inject(ProjectService);
    #inputModalService = inject(InputModalService);
    #extIssueBacklogService = inject(ExtIssueBacklogService);
    #modalService = inject(ModalBaseService);

    rangeStart = signal(dayjs().startOf('day'));
    rangeEnd = signal(dayjs().startOf('day').add(HORIZON_MONTHS, 'months'));

    readonly #userId = computed(() => this.global.user?.id || undefined);
    readonly #workloadParams = computed(() => {
        const userId = this.#userId();
        return userId ? { userId, start: this.rangeStart().format('YYYY-MM-DD'), end: this.rangeEnd().format('YYYY-MM-DD') } : undefined;
    });

    readonly #workload = modelResource(this.#workloadParams, (_) => this.#userService.showDailyWorkload(_.userId, _.start, _.end));
    readonly #milestones = modelListResource(this.#userId, (userId) => this.#milestoneService.indexUserMilestones(userId));

    readonly workloadData = computed(() => mapWorkloadDto(this.#workload.value()));
    readonly projectGroups = computed(() => {
        const groups = this.#milestones.value();
        groups.forEach((g) => g.milestones.forEach((m) => (m.project ??= g.project)));
        return groups;
    });

    readonly #excludeKeys = computed(() =>
        this.#allMilestones()
            .filter((m) => m.ext_issue_id && m.ext_issue_plugin_link_id)
            .map((m) => `${m.ext_issue_plugin_link_id}:${m.ext_issue_id}`)
            .sort()
            .join('\n'),
    );
    readonly #externalIssues = modelListResource(
        () => (['idle', 'loading'].includes(this.#milestones.status()) ? undefined : this.#excludeKeys()),
        (keys) => this.#extIssueBacklogService.loadAssignedIssues(new Set(keys.split('\n').filter(Boolean))),
    );
    readonly externalIssues = this.#externalIssues.value;
    readonly externalIssuesLoading = this.#externalIssues.isLoading;

    readonly loading = computed(() => ['idle', 'loading'].includes(this.#workload.status()) || ['idle', 'loading'].includes(this.#milestones.status()));
    readonly error = computed(() => (this.#workload.error() || this.#milestones.error() ? 'Failed to load planner data' : null));

    readonly #allMilestones = computed(() => this.projectGroups().flatMap((g) => g.milestones));
    readonly undatedMilestones = computed(() => {
        const unconfiguredIds = new Set(this.workloadData()?.unconfigured_milestones.map((m) => m.id));
        return this.#allMilestones().filter((m) => !m.started_at && !m.due_at && !unconfiguredIds.has(m.id));
    });
    readonly scheduledMilestones = computed(() => this.#allMilestones().filter((m) => m.started_at && m.due_at));

    onRangeShift(months: number): void {
        this.rangeStart.update((d) => d.add(months, 'months'));
        this.rangeEnd.update((d) => d.add(months, 'months'));
    }

    onRangeToday(): void {
        this.rangeStart.set(dayjs().startOf('day'));
        this.rangeEnd.set(dayjs().startOf('day').add(HORIZON_MONTHS, 'months'));
    }

    onAddMilestone(project: Project) {
        this.#inputModalService
            .open($localize`:@@i18n.common.addMilestone:add milestone`)
            .then((result) => {
                if (result?.text?.trim()) {
                    this.#projectService.createMilestone(project.id, { name: result.text.trim() }).subscribe({
                        next: () => {
                            Toast.success($localize`:@@i18n.milestone.created:milestone created`);
                            this.#reload();
                        },
                        error: () => Toast.error($localize`:@@i18n.milestone.createError:failed to create milestone`),
                    });
                }
            })
            .catch(() => void 0);
    }

    onEditMilestone(milestone: Milestone): void {
        const projects = this.projectGroups().map((g) => g.project);
        this.#modalService.open(ModalEditMilestoneComponent, milestone, milestone.project, projects).then(() => this.#reload());
    }

    onMilestoneRescheduled({ milestone, started_at, due_at }: MilestoneReschedule): void {
        milestone.update({ started_at, due_at }, true).subscribe({
            next: () => this.#reload(),
            error: () => Toast.error($localize`:@@i18n.planner.scheduleError:failed to schedule milestone`),
        });
    }

    onCalendarDrop(drop: CapacityCalendarDrop): void {
        const item = drop.item as BacklogDragItem;
        if (item?.kind === 'milestone') this.#scheduleMilestone(item.milestone, drop.date);
        if (item?.kind === 'issue') this.#convertIssue(item.issue, drop.date);
    }

    onAddMilestoneForDay(date: string): void {
        const projects = this.projectGroups().map((g) => g.project);
        this.#modalService.open(ModalAddMilestoneComponent, projects, date).then((result) => {
            if (!result) return;
            this.#projectService
                .createMilestone(result.project.id, {
                    name: result.name,
                    workload_hours: result.workload_hours,
                    started_at: result.started_at,
                    due_at: result.due_at,
                })
                .subscribe({
                    next: () => {
                        Toast.success($localize`:@@i18n.milestone.created:milestone created`);
                        this.#reload();
                    },
                    error: () => Toast.error($localize`:@@i18n.milestone.createError:failed to create milestone`),
                });
        });
    }

    #convertIssue(issue: ExtIssueBacklogItem, dropDate: string): void {
        this.#modalService.open(ModalConvertIssueComponent, issue, dropDate).then((result) => {
            if (!result) return;
            this.#projectService
                .createMilestone(result.project.id, {
                    name: result.name,
                    workload_hours: result.workload_hours,
                    started_at: result.started_at,
                    due_at: result.due_at,
                    ext_issue_plugin_link_id: result.pluginLinkId ?? null,
                    ext_issue_id: issue.issueId,
                })
                .subscribe({
                    next: () => {
                        Toast.success($localize`:@@i18n.planner.issueConverted:issue converted to milestone`);
                        this.#reload();
                    },
                    error: () => Toast.error($localize`:@@i18n.planner.convertError:failed to convert issue`),
                });
        });
    }

    #scheduleMilestone(milestone: Milestone, date: string): void {
        const fallbackHpd = (this.workloadData()?.hpw ?? 40) / 5;
        const hours = milestone.workload_hours ?? fallbackHpd;
        const workloadByDate = new Map((this.workloadData()?.daily_workload ?? []).map((d) => [d.date, d]));

        const startedAt = dayjs(date);
        let dueAt = startedAt;
        let remaining = hours;
        for (let cursor = startedAt; remaining > 0; cursor = cursor.add(1, 'day')) {
            const day = workloadByDate.get(cursor.format('YYYY-MM-DD'));
            if (day?.is_break) continue;
            remaining -= day?.available_hours || fallbackHpd || 1;
            dueAt = cursor;
        }

        milestone
            .update(
                {
                    started_at: startedAt.format('YYYY-MM-DD'),
                    due_at: dueAt.format('YYYY-MM-DD'),
                    workload_hours: milestone.workload_hours ?? hours,
                },
                true,
            )
            .subscribe({
                next: () => this.#reload(),
                error: () => Toast.error($localize`:@@i18n.planner.scheduleError:failed to schedule milestone`),
            });
    }

    #reload(): void {
        this.#workload.reload();
        this.#milestones.reload();
    }
}
