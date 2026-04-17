import { ProjectService } from '@models/project/project.service';
import { Component, DestroyRef, OnInit, inject, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstOrDefault } from '@constants/constants';
import { Project } from '@models/project/project.model';
import { Assignee } from '@models/assignee/assignee.model';
import { Milestone } from '@models/milestones/milestone.model';
import { ProjectDetailGuard } from '@app/projects/project-details.guard';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { NgbTooltipModule, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { InputModalService } from '@app/_modals/modal-input/modal-input.component';
import { ConfirmationService } from '@app/_modals/modal-confirm/confirmation.service';
import { Toast } from '@shards/toast/toast';
import { Task } from '@models/tasks/task.model';
import { CustomGanttComponent, GanttRow } from '@app/projects/_shards/custom-gantt/custom-gantt.component';


interface T_ASSIGNMENT { assignee: Assignee, tasks: Task[] }

@Component({
    selector: 'project-milestones',
    templateUrl: './project-milestones.component.html',
    styleUrls: ['./project-milestones.component.scss'],
    standalone: true,
    host: { class: 'container-full'},
    imports: [ToolbarComponent, CustomGanttComponent, NgbTooltipModule, NgbDropdownModule]
})
export class ProjectMilestonesComponent implements OnInit {

    ganttComponent = viewChild(CustomGanttComponent);

    project: Project
    assignees: T_ASSIGNMENT[] = []
    currentViewMode: string = localStorage.getItem('projectMilestonesViewMode') || 'Week'
    ganttRows: GanttRow[] = []
    isLoading = true
    #isInitialized = false;

    parent = inject(ProjectDetailGuard)

    #destroyRef = inject(DestroyRef)
    #projectService = inject(ProjectService)
    #inputModalService = inject(InputModalService)
    #confirmationService = inject(ConfirmationService)

    ngOnInit(): void {
        this.parent.onChange.subscribe(() => {
            this.project = this.parent.current
            // Only load milestones once on initial load
            if (!this.#isInitialized) {
                this.#isInitialized = true;
                this.loadMilestones()
            }
        })
    }

    loadMilestones() {
        if (!this.project?.id) {
            return;
        }

        this.isLoading = true;
        this.#projectService.indexMilestones(this.project.id).pipe(takeUntilDestroyed(this.#destroyRef)).subscribe({
            next: (response: any) => {
                const milestonesWithTasks = response.milestones || [];
                const projectTasks = response.project_tasks || [];

                // Extract milestones and properly instantiate them as Milestone objects
                const milestones = milestonesWithTasks.map((item: any) => {
                    const milestone = Milestone.fromJson(item.milestone);
                    milestone.project = this.project;
                    return milestone;
                });

                this.project.milestones = milestones;
                this.project.tasks = projectTasks;
                this.#prepareGanttRows();
                this.isLoading = false;
            },
            error: (error: any) => {
                console.error('Error loading milestones:', error);
                this.isLoading = false;
            }
        });
    }

    #prepareGanttRows() {
        this.ganttRows = [];

        // Add header row for project
        this.ganttRows.push({
            type: 'header',
            data: this.project,
            project: this.project
        });

        // Add project-level tasks
        (this.project.tasks || []).forEach((task: Task) => {
            this.ganttRows.push({
                type: 'task',
                data: task,
                project: this.project
            });
        });

        // Add milestones and their tasks
        (this.project.milestones || []).forEach((milestone: Milestone) => {
            this.ganttRows.push({
                type: 'milestone',
                data: milestone,
                project: this.project
            });

            // Add tasks for this milestone
            ((milestone as any).tasks || []).forEach((task: Task) => {
                this.ganttRows.push({
                    type: 'task',
                    data: task,
                    project: this.project,
                    milestone: milestone
                });
            });
        });
    }

    find = (id: string): T_ASSIGNMENT => firstOrDefault(this.assignees, ((x: any) => x.assignee.id == id), this.assignees[0])

    onAddButton = () => {
        this.#inputModalService.open($localize`:@@i18n.common.addMilestone:add milestone`)
            .then(result => {
                if (result?.text?.trim()) {
                    this.#projectService.createMilestone(this.project.id, {
                        name: result.text.trim()
                    }).pipe(takeUntilDestroyed(this.#destroyRef))
                        .subscribe({
                            next: () => {
                                Toast.success($localize`:@@i18n.milestone.created:milestone created`);
                                this.loadMilestones();
                            },
                            error: (error: any) => {
                                Toast.error($localize`:@@i18n.milestone.createError:failed to create milestone`);
                                console.error('Error creating milestone:', error);
                            }
                        });
                }
            })
            .catch(() => {
                // User cancelled - no action needed
            });
    }

    onViewModeChange = (mode: string) => {
        this.currentViewMode = mode;
        localStorage.setItem('projectMilestonesViewMode', mode);
    }

    onConvertInvoiceItems = () => {
        if (!this.project?.id) {
            return;
        }

        if (!this.project?.invoice_items?.length) {
            return;
        }

        // Use bulk conversion endpoint
        this.#projectService.convertInvoiceItemsToMilestones(this.project.id)
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe({
                next: (response: any) => {
                    if (response.milestones_created > 0) {
                        // Reload milestones to reflect changes
                        this.loadMilestones();
                    }
                },
                error: (error) => {
                    // Keep error logging for debugging purposes
                    console.error('Error converting invoice items to milestones:', error);
                }
            });
    }

    onWipeBoard = () => {
        if (!this.project?.id) {
            return;
        }

        const milestoneCount = this.project.milestones?.length || 0;
        if (milestoneCount === 0) {
            return;
        }

        this.#confirmationService.confirm({
            title: $localize`:@@i18n.milestones.wipeBoardTitle:Wipe Board`,
            message: $localize`:@@i18n.milestones.wipeBoardMessage:Are you sure you want to delete all ${milestoneCount} milestones? This action cannot be undone.`,
            btnOkText: $localize`:@@i18n.common.delete:delete`,
            btnCancelText: $localize`:@@i18n.common.cancel:cancel`,
            dialogSize: 'sm'
        })
        .then(() => {
            // User confirmed - proceed with deletion
            this.#projectService.wipeMilestones(this.project.id.toString())
                .pipe(takeUntilDestroyed(this.#destroyRef))
                .subscribe({
                    next: () => {
                        Toast.success($localize`:@@i18n.milestones.allMilestonesDeleted:All milestones deleted successfully`);
                        this.loadMilestones(); // Reload to clear the list
                    },
                    error: (error) => {
                        Toast.error($localize`:@@i18n.milestones.errorDeletingMilestones:Failed to delete milestones`);
                        console.error('Error deleting all milestones:', error);
                    }
                });
        })
        .catch(() => {
            // User cancelled - no action needed
        });
    }

    onAddTask = (project: Project) => {
        this.#inputModalService.open($localize`:@@i18n.task.addTask:Add Task`)
            .then(result => {
                if (result?.text?.trim()) {
                    this.#projectService.createTaskForProject(project.id, {
                        name: result.text.trim(),
                        parent_type: 'App\\Models\\Project',
                        parent_id: project.id
                    }).pipe(takeUntilDestroyed(this.#destroyRef))
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

}
