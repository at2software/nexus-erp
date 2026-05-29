import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { GlobalService } from '@models/global.service';
import { MilestoneService } from '@models/milestones/milestone.service';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { Milestone } from '@models/milestones/milestone.model';
import { Project } from '@models/project/project.model';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { InputModalService } from '@app/_modals/modal-input/modal-input.component';
import { ProjectService } from '@models/project/project.service';
import { Task } from '@models/tasks/task.model';
import { TaskService } from '@models/tasks/task.service';
import { Toast } from '@shards/toast/toast';
import { CustomGanttComponent, GanttRow } from '@app/projects/_shards/custom-gantt/custom-gantt.component';
import { HrTeamService } from '../hr-team/hr-team.service';
import { SpinnerComponent } from '@shards/spinner/spinner.component';

@Component({
    selector: 'hr-milestones',
    templateUrl: './hr-milestones.component.html',
    styleUrls: ['./hr-milestones.component.scss'],
    standalone: true,
    imports: [ToolbarComponent, CustomGanttComponent, NgbDropdownModule, SpinnerComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HrMilestonesComponent {
    global = inject(GlobalService);
    #hrTeamService = inject(HrTeamService);
    #milestoneService = inject(MilestoneService);
    #projectService = inject(ProjectService);
    #taskService = inject(TaskService);
    #inputModalService = inject(InputModalService);

    protected readonly ganttComponent = viewChild(CustomGanttComponent);

    ganttRows = signal<GanttRow[]>([]);
    milestoneProjectMap = signal(new Map<string, Project>());
    currentViewMode = signal<string>(localStorage.getItem('hrMilestonesViewMode') || 'Week');
    loading = signal(true);
    error = signal<string | null>(null);

    #allMilestones: Milestone[] = [];
    #projectGroups: any[] = [];

    get workloadUser() {
        return this.#hrTeamService.getUser();
    }

    constructor() {
        this.#hrTeamService.onUserChange.pipe(takeUntilDestroyed()).subscribe(() => this.loadMilestones());
    }

    loadMilestones() {
        const userId = this.#hrTeamService.getUserId();
        if (!userId) {
            this.error.set('No user selected');
            this.loading.set(false);
            return;
        }

        this.loading.set(true);
        this.error.set(null);

        this.#milestoneService.indexUserMilestones(userId).subscribe({
            next: (groups: any[]) => {
                groups.forEach((_) => {
                    _.project = Project.fromJson(_.project);
                    _.project_tasks = _.project_tasks || [];
                    _.milestones = _.milestones.map((item: any) => {
                        const ms = Milestone.fromJson(item.milestone);
                        ms.project = _.project;
                        (ms as any).tasks = item.tasks || [];
                        return ms;
                    });
                });
                this.#projectGroups = groups;
                this.#prepareMilestones(groups);
                this.#prepareGanttRows();
                this.loading.set(false);
            },
            error: () => {
                this.error.set('Failed to load milestones');
                this.loading.set(false);
            },
        });
    }

    onViewModeChange = (mode: string) => {
        this.currentViewMode.set(mode);
        localStorage.setItem('hrMilestonesViewMode', mode);
    };

    onAddMilestone(project: Project) {
        this.#inputModalService.open($localize`:@@i18n.common.addMilestone:add milestone`).then((result) => {
            if (!result?.text?.trim()) return;
            this.#projectService.createMilestone(project.id, { name: result.text.trim() }).subscribe({
                next: () => {
                    Toast.success($localize`:@@i18n.milestone.created:milestone created`);
                    this.loadMilestones();
                },
                error: () => Toast.error($localize`:@@i18n.milestone.createError:failed to create milestone`),
            });
        }).catch(() => undefined);
    }

    onAddTask(project: Project) {
        this.#inputModalService.open($localize`:@@i18n.task.addTask:Add Task`).then((result) => {
            if (!result?.text?.trim()) return;
            this.#projectService.createTaskForProject(project.id, { name: result.text.trim(), parent_type: 'App\\Models\\Project', parent_id: project.id }).subscribe({
                next: () => {
                    Toast.success($localize`:@@i18n.task.created:Task created`);
                    this.loadMilestones();
                },
                error: () => Toast.error($localize`:@@i18n.task.createError:Failed to create task`),
            });
        }).catch(() => undefined);
    }

    #prepareMilestones(groups: any[]) {
        this.#allMilestones = [];
        const map = new Map<string, Project>();

        groups.forEach((group) => {
            group.milestones?.forEach((milestone: Milestone) => {
                map.set(milestone.id, group.project);
                this.#allMilestones.push(milestone);
            });
        });

        this.#allMilestones.sort((a, b) => {
            const aId = String(a.project_id || '');
            const bId = String(b.project_id || '');
            return aId !== bId ? aId.localeCompare(bId) : String(a.id || '').localeCompare(String(b.id || ''));
        });

        this.milestoneProjectMap.set(map);
    }

    #prepareGanttRows() {
        const rows: GanttRow[] = [];

        this.#projectGroups.forEach((group) => {
            const project = group.project;
            rows.push({ type: 'header', data: project, project });

            (group.project_tasks || []).forEach((task: any) => {
                const t = Task.fromJson(task);
                t.httpService = this.#taskService;
                rows.push({ type: 'task', data: t, project });
            });

            (group.milestones || []).forEach((milestone: Milestone) => {
                rows.push({ type: 'milestone', data: milestone, project });
                ((milestone as any).tasks || []).forEach((task: any) => {
                    const t = Task.fromJson(task);
                    t.httpService = this.#taskService;
                    rows.push({ type: 'task', data: t, project });
                });
            });
        });

        this.ganttRows.set(rows);
    }
}
