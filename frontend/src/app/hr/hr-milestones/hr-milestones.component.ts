import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';

import { GlobalService } from '@models/global.service';
import { MilestoneService } from '@models/milestones/milestone.service';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { Milestone } from '@models/milestones/milestone.model';
import { Project } from '@models/project/project.model';
import { ProjectService } from '@models/project/project.service';
import { UserService } from '@models/user/user.service';
import { Toast } from '@shards/toast/toast';
import { HrTeamService } from '../hr-team/hr-team.service';
import { SpinnerComponent } from '@shards/spinner/spinner.component';
import { MilestonesGroup } from '@models/milestones/api.milestone-group';
import { dayjs } from '@constants/dates';
import { DailyWorkload, DailyWorkloadElement, WorkloadData } from '@models/api-response';
import { ModalBaseService } from '@app/_modals/modal-base-service';
import { ModalEditMilestoneComponent } from '@app/_modals/modal-edit-milestone/modal-edit-milestone.component';
import { CapacityCalendarComponent, MilestoneReschedule } from '@app/profile/profile-milestones/capacity-calendar/capacity-calendar.component';
import { ModalAddMilestoneComponent } from '@app/profile/profile-milestones/capacity-calendar/modal-add-milestone/modal-add-milestone.component';

const HORIZON_MONTHS = 3;

@Component({
    selector: 'hr-milestones',
    templateUrl: './hr-milestones.component.html',
    styleUrls: ['./hr-milestones.component.scss'],
    imports: [ToolbarComponent, SpinnerComponent, CapacityCalendarComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HrMilestonesComponent {
    global = inject(GlobalService);
    #hrTeamService = inject(HrTeamService);
    #milestoneService = inject(MilestoneService);
    #userService = inject(UserService);
    #projectService = inject(ProjectService);
    #modalService = inject(ModalBaseService);

    rangeStart = signal(dayjs().startOf('day'));
    rangeEnd = signal(dayjs().startOf('day').add(HORIZON_MONTHS, 'months'));

    workloadData = signal<WorkloadData | null>(null);
    projectGroups = signal<MilestonesGroup[]>([]);

    loading = signal(true);
    error = signal<string | null>(null);

    readonly #allMilestones = computed(() => this.projectGroups().flatMap((g) => g.milestones));
    /** Milestones with both dates set render as spanning bars on the calendar. */
    readonly scheduledMilestones = computed(() => this.#allMilestones().filter((m) => m.started_at && m.due_at));

    constructor() {
        this.#hrTeamService.onUserChange.pipe(takeUntilDestroyed()).subscribe(() => this.#load());
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

    /** Refetches workload + milestones for the HR-viewed user. `silent` keeps the current UI visible instead of blanking it behind a spinner — used after in-place mutations (reschedule, edit, add). */
    #load(silent = false): void {
        const user = this.#hrTeamService.getUser();
        const userId = this.#hrTeamService.getUserId();
        if (!user || !userId) {
            this.error.set('No user selected');
            this.loading.set(false);
            return;
        }

        if (!silent) this.loading.set(true);
        this.error.set(null);

        const start = this.rangeStart().format('YYYY-MM-DD');
        const end = this.rangeEnd().format('YYYY-MM-DD');

        forkJoin([this.#userService.showDailyWorkload(user, start, end), this.#milestoneService.indexUserMilestones(userId)]).subscribe({
            next: ([workload, groups]) => {
                groups.forEach((g) => g.milestones.forEach((m) => (m.project ??= g.project)));
                this.workloadData.set(this.#mapWorkload(workload));
                this.projectGroups.set(groups);
                this.loading.set(false);
            },
            error: () => {
                this.error.set('Failed to load milestones');
                this.loading.set(false);
            },
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
