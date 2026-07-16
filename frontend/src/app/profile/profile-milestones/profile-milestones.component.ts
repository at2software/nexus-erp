import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { GlobalService } from '@models/global.service';
import { MilestoneService } from '@models/milestones/milestone.service';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { Milestone } from '@models/milestones/milestone.model';
import { Project } from '@models/project/project.model';
import { InputModalService } from '@app/_modals/modal-input/modal-input.component';
import { UserService } from '@models/user/user.service';
import { ProjectService } from '@models/project/project.service';
import { Toast } from '@shards/toast/toast';
import { SpinnerComponent } from '@shards/spinner/spinner.component';
import { MilestonesGroup } from '@models/milestones/api.milestone-group';
import { dayjs } from '@constants/dates';
import { DailyWorkload, DailyWorkloadElement, WorkloadData } from '@models/api-response';
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

    workloadData = signal<WorkloadData | null>(null);
    projectGroups = signal<MilestonesGroup[]>([]);

    externalIssues = signal<ExtIssueBacklogItem[]>([]);
    externalIssuesLoading = signal(false);

    loading = signal(true);
    error = signal<string | null>(null);

    readonly #allMilestones = computed(() => this.projectGroups().flatMap((g) => g.milestones));
    /** Excludes milestones already shown in the "unconfigured" backlog rail so a single milestone never appears as a draggable chip twice. */
    readonly undatedMilestones = computed(() => {
        const unconfiguredIds = new Set(this.workloadData()?.unconfigured_milestones.map((m) => m.id));
        return this.#allMilestones().filter((m) => !m.started_at && !m.due_at && !unconfiguredIds.has(m.id));
    });
    /** Milestones with both dates set render as spanning bars on the calendar. */
    readonly scheduledMilestones = computed(() => this.#allMilestones().filter((m) => m.started_at && m.due_at));

    constructor() {
        this.#load();
    }

    onRangeShift(months: number): void {
        this.rangeStart.update((d) => d.add(months, 'months'));
        this.rangeEnd.update((d) => d.add(months, 'months'));
        this.#load();
    }

    onRangeToday(): void {
        this.rangeStart.set(dayjs().startOf('day'));
        this.rangeEnd.set(dayjs().startOf('day').add(HORIZON_MONTHS, 'months'));
        this.#load();
    }

    onAddMilestone(project: Project) {
        this.#inputModalService
            .open($localize`:@@i18n.common.addMilestone:add milestone`)
            .then((result) => {
                if (result?.text?.trim()) {
                    this.#projectService.createMilestone(project.id, { name: result.text.trim() }).subscribe({
                        next: () => {
                            Toast.success($localize`:@@i18n.milestone.created:milestone created`);
                            this.#load(true);
                        },
                        error: () => Toast.error($localize`:@@i18n.milestone.createError:failed to create milestone`),
                    });
                }
            })
            .catch(() => void 0);
    }

    onEditMilestone(milestone: Milestone): void {
        const projects = this.projectGroups().map((g) => g.project);
        this.#modalService.open(ModalEditMilestoneComponent, milestone, milestone.project, projects).then(() => this.#load(true));
    }

    onMilestoneRescheduled({ milestone, started_at, due_at }: MilestoneReschedule): void {
        milestone.update({ started_at, due_at }, true).subscribe({
            next: () => this.#load(true),
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
                        this.#load(true);
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
                        this.#load(true);
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
        // Walk forward day by day, skipping break days entirely, so the milestone never ends up due on a break.
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
                next: () => this.#load(true),
                error: () => Toast.error($localize`:@@i18n.planner.scheduleError:failed to schedule milestone`),
            });
    }

    /** Refetches workload + milestones. `silent` keeps the current UI visible instead of blanking it behind a spinner — used after in-place mutations (drag/drop, reschedule, edit) so the calendar doesn't appear to "reload". */
    #load(silent = false): void {
        const user = this.global.user;
        if (!user?.id) {
            this.error.set('No user found');
            this.loading.set(false);
            return;
        }

        if (!silent) this.loading.set(true);
        this.error.set(null);

        const start = this.rangeStart().format('YYYY-MM-DD');
        const end = this.rangeEnd().format('YYYY-MM-DD');

        forkJoin([this.#userService.showDailyWorkload(user, start, end), this.#milestoneService.indexUserMilestones(user.id)]).subscribe({
            next: ([workload, groups]) => {
                // Attach each group's project to its milestones so bars get the right colour and the edit modal a project.
                groups.forEach((g) => g.milestones.forEach((m) => (m.project ??= g.project)));
                this.workloadData.set(this.#mapWorkload(workload));
                this.projectGroups.set(groups);
                this.loading.set(false);
                this.#loadExternalIssues(groups);
            },
            error: () => {
                this.error.set('Failed to load planner data');
                this.loading.set(false);
            },
        });
    }

    /** Loaded async, separately from the main planner fetch — external tracker latency must never block the calendar. */
    #loadExternalIssues(groups: MilestonesGroup[]): void {
        const excludeKeys = new Set(
            groups.flatMap((g) => g.milestones).filter((m) => m.ext_issue_id && m.ext_issue_plugin_link_id).map((m) => `${m.ext_issue_plugin_link_id}:${m.ext_issue_id}`),
        );
        this.externalIssuesLoading.set(true);
        this.#extIssueBacklogService.loadAssignedIssues(excludeKeys).subscribe((issues) => {
            this.externalIssues.set(issues);
            this.externalIssuesLoading.set(false);
        });
    }

    #mapWorkload(data: WorkloadData): WorkloadData {
        const dailyWorkload: DailyWorkload[] = data.daily_workload.map((day) => ({
            ...day,
            elements: day.elements.map((el): DailyWorkloadElement => ({ ...el, project: el.project ? Project.fromJson(el.project) : undefined })),
        }));
        const unconfiguredMilestones = data.unconfigured_milestones.map((m) => Milestone.fromJson(m));
        return { ...data, daily_workload: dailyWorkload, unconfigured_milestones: unconfiguredMilestones };
    }
}
