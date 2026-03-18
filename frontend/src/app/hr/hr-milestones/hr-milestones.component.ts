import { Component, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { GlobalService } from 'src/models/global.service';
import { MilestoneService } from 'src/models/milestones/milestone.service';
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

@Component({
    selector: 'hr-milestones',
    templateUrl: './hr-milestones.component.html',
    styleUrls: ['./hr-milestones.component.scss'],
    standalone: true,
    imports: [CommonModule, ToolbarComponent, CustomGanttComponent, NgbDropdownModule]
})
export class HrMilestonesComponent implements OnInit, OnDestroy {
    @ViewChild(CustomGanttComponent) ganttComponent?: CustomGanttComponent;

    allMilestones: Milestone[] = [];
    ganttRows: GanttRow[] = [];
    milestoneProjectMap = new Map<string, Project>();
    projectGroups: any[] = [];
    currentViewMode: string = localStorage.getItem('hrMilestonesViewMode') || 'Week';
    loading: boolean = true;
    error: string | null = null;
    #destroy$ = new Subject<void>();

    get workloadUser() {
        return this.#hrTeamService.getUser();
    }

    global = inject(GlobalService);
    #hrTeamService = inject(HrTeamService);
    #milestoneService = inject(MilestoneService);
    #projectService = inject(ProjectService);
    #taskService = inject(TaskService);
    #inputModalService = inject(InputModalService);

    ngOnInit(): void {
        // Reload when selected user changes
        this.#hrTeamService.onUserChange.pipe(takeUntil(this.#destroy$)).subscribe(() => {
            this.loadMilestones();
        });
    }

    loadMilestones() {
        const userId = this.#hrTeamService.getUserId();
        if (!userId) {
            this.error = 'No user selected';
            this.loading = false;
            return;
        }

        this.loading = true;
        this.error = null;

        this.#milestoneService.indexUserMilestones(userId)
            .pipe(takeUntil(this.#destroy$))
            .subscribe({
                next: (groups: any[]) => {
                    groups.forEach(_ => {
                        _.project = Project.fromJson(_.project);
                        _.project_tasks = _.project_tasks || [];
                        _.milestones = _.milestones.map((item: any) => {
                            const ms = Milestone.fromJson(item.milestone)
                            ms.project = _.project;
                            (ms as any).tasks = item.tasks || [];
                            return ms;
                        });
                    });

                    this.projectGroups = groups;
                    this.#prepareMilestones(groups);
                    this.#prepareGanttRows();
                    this.loading = false;
                },
                error: (error) => {
                    console.error('Error loading user milestones:', error);
                    this.error = 'Failed to load milestones';
                    this.loading = false;
                }
            });
    }

    #prepareMilestones(groups: any[]) {
        this.allMilestones = [];
        this.milestoneProjectMap.clear();

        groups.forEach(group => {
            if (group.milestones && group.milestones.length > 0) {
                group.milestones.forEach((milestone: Milestone) => {
                    this.milestoneProjectMap.set(milestone.id, group.project);
                    this.allMilestones.push(milestone);
                });
            }
        });

        this.allMilestones.sort((a, b) => {
            const aProjectId = String(a.project_id || '');
            const bProjectId = String(b.project_id || '');
            if (aProjectId !== bProjectId) {
                return aProjectId.localeCompare(bProjectId);
            }
            return String(a.id || '').localeCompare(String(b.id || ''));
        });
    }

    #prepareGanttRows() {
        this.ganttRows = [];

        this.projectGroups.forEach(group => {
            const project = group.project;

            this.ganttRows.push({
                type: 'header',
                data: project,
                project: project
            });

            (group.project_tasks || []).forEach((task: any) => {
                const taskInstance = Task.fromJson(task);
                taskInstance.httpService = this.#taskService;
                this.ganttRows.push({
                    type: 'task',
                    data: taskInstance,
                    project: project
                });
            });

            (group.milestones || []).forEach((milestone: Milestone) => {
                this.ganttRows.push({
                    type: 'milestone',
                    data: milestone,
                    project: project
                });

                ((milestone as any).tasks || []).forEach((task: any) => {
                    const taskInstance = Task.fromJson(task);
                    taskInstance.httpService = this.#taskService;
                    this.ganttRows.push({
                        type: 'task',
                        data: taskInstance,
                        project: project
                    });
                });
            });
        });
    }

    onViewModeChange = (mode: string) => {
        this.currentViewMode = mode;
        localStorage.setItem('hrMilestonesViewMode', mode);
    }

    onAddMilestone(project: Project) {
        this.#inputModalService.open($localize`:@@i18n.common.addMilestone:add milestone`)
            .then(result => {
                if (result?.text?.trim()) {
                    this.#projectService.createMilestone(project.id, {
                        name: result.text.trim()
                    }).pipe(takeUntil(this.#destroy$))
                        .subscribe({
                            next: () => {
                                Toast.success($localize`:@@i18n.milestone.created:milestone created`);
                                this.loadMilestones();
                            },
                            error: (error) => {
                                Toast.error($localize`:@@i18n.milestone.createError:failed to create milestone`);
                                console.error('Error creating milestone:', error);
                            }
                        });
                }
            })
            .catch(() => {
                // User cancelled
            });
    }

    onAddTask(project: Project) {
        this.#inputModalService.open($localize`:@@i18n.task.addTask:Add Task`)
            .then(result => {
                if (result?.text?.trim()) {
                    this.#projectService.createTaskForProject(project.id, {
                        name: result.text.trim(),
                        parent_type: 'App\\Models\\Project',
                        parent_id: project.id
                    }).pipe(takeUntil(this.#destroy$))
                        .subscribe({
                            next: () => {
                                Toast.success($localize`:@@i18n.task.created:Task created`);
                                this.loadMilestones();
                            },
                            error: (error: any) => {
                                Toast.error($localize`:@@i18n.task.createError:Failed to create task`);
                                console.error('Error creating task:', error);
                            }
                        });
                }
            })
            .catch(() => {
                // User cancelled
            });
    }

    ngOnDestroy() {
        this.#destroy$.next();
        this.#destroy$.complete();
    }
}
