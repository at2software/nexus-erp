import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbDropdownModule, NgbProgressbarModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { NgxDaterangepickerMd } from 'ngx-daterangepicker-material';
import { Milestone } from 'src/models/milestones/milestone.model';
import { Project } from 'src/models/project/project.model';
import { User } from 'src/models/user/user.model';
import { Task } from 'src/models/tasks/task.model';
import { MilestoneState, MILESTONE_STATES } from 'src/models/milestones/milestone-state.enum';
import { MilestoneService } from 'src/models/milestones/milestone.service';
import { ProjectService } from 'src/models/project/project.service';
import { Toast } from '@shards/toast/toast';
import { takeUntil } from 'rxjs';
import { BaseComponent } from '@app/shared/base-component';
import moment from 'moment';
import { AffixInputDirective } from '@directives/affix-input.directive';
import { InputModalService } from '@app/_modals/modal-input/modal-input.component';
import { NexusModule } from '@app/nx/nexus.module';
import { TaskService } from '@models/tasks/task.service';

@Component({
    selector: 'milestone-popup',
    templateUrl: './milestone-popup.component.html',
    styleUrls: ['./milestone-popup.component.scss'],
    standalone: true,
    imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    NgbDropdownModule,
    NgbProgressbarModule,
    NgxDaterangepickerMd,
    NgbTooltipModule,
    AffixInputDirective,
    NexusModule,
]
})
export class MilestonePopupComponent extends BaseComponent implements OnInit, OnChanges {
    @Input() milestone!: Milestone;
    @Input() project?: Project;
    @Input() position: { x: number; y: number } = { x: 0, y: 0 };
    @Input() visible: boolean = false;

    @Output() closed = new EventEmitter<void>();
    @Output() updated = new EventEmitter<Milestone>();
    @Output() deleted = new EventEmitter<Milestone>();

    milestoneForm!: FormGroup;
    milestoneStates = MILESTONE_STATES;
    MilestoneState = MilestoneState;
    projectUsers: User[] = [];

    dateRanges: any = {
        'Today': [moment(), moment()],
        'Tomorrow': [moment().add(1, 'day'), moment().add(1, 'day')],
        'This Week': [moment(), moment().add(6, 'day')],
        'Next Week': [moment().add(7, 'day'), moment().add(13, 'day')]
    };

    dateRangeModel: { startDate: any, endDate: any } | null = null;

    #formBuilder = inject(FormBuilder);
    #milestoneService = inject(MilestoneService);
    #projectService = inject(ProjectService);
    #inputModalService = inject(InputModalService);
    #taskService = inject(TaskService);

    ngOnInit() {
        this.initializeForm();
    }

    ngOnChanges(changes: SimpleChanges) {
        // Reinitialize form when milestone changes
        if (changes['project'] && this.project) {
            this.projectUsers = this.project?.getAssignedUsers().map(_ => _.assignee as User);
        }
        if (changes['milestone'] && this.milestone) {
            // Check if the milestone ID has actually changed
            const previousMilestone = changes['milestone'].previousValue;
            const currentMilestone = changes['milestone'].currentValue;

            if (!previousMilestone || previousMilestone.id !== currentMilestone.id) {
                this.initializeForm();
            }
        }
    }

    initializeForm() {
        if (!this.milestone) return;

        this.milestone.tasks.forEach((task) => {
            task.httpService = this.#taskService
        });

        const startDate = this.milestone.started_at ? this.milestone.time_started() : moment();
        const endDate = this.milestone.due_at ? this.milestone.time_due() : moment();

        this.dateRangeModel = { startDate, endDate };

        if (this.milestoneForm) {
            // Update existing form
            this.milestoneForm.patchValue({
                name: this.milestone.name || '',
                comments: this.milestone.comments || '',
                progress: this.milestone.progress || 0,
                state: this.milestone.state || MilestoneState.TODO,
                user_id: this.milestone.user_id,
                workload_hours: this.milestone.workload_hours
            });
        } else {
            // Create new form
            this.milestoneForm = this.#formBuilder.group({
                name: [this.milestone.name || '', [Validators.required, Validators.minLength(1)]],
                comments: [this.milestone.comments || ''],
                progress: [this.milestone.progress || 0, [Validators.min(0), Validators.max(1)]],
                state: [this.milestone.state || MilestoneState.TODO],
                user_id: [this.milestone.user_id],
                workload_hours: [this.milestone.workload_hours, [Validators.min(0)]]
            });
        }
    }

    get hasInvoiceItems(): boolean {
        return this.milestone?.invoice_items && this.milestone.invoice_items.length > 0;
    }

    getSelectedUser(): User | null {
        const userId = this.milestoneForm.get('user_id')?.value;
        if (!userId || !this.projectUsers) return null;
        return this.projectUsers.find(user => user.id === userId) || null;
    }

    getTotalInvoiceItemDuration(): number {
        if (!this.milestone?.invoice_items || !Array.isArray(this.milestone.invoice_items)) return 0;
        return this.milestone.invoice_items.reduce((total, item) => total + (item.qty || 0), 0);
    }

    onDateRangeChange(event: any) {
        if (event.startDate && event.endDate) {
            this.dateRangeModel = {
                startDate: event.startDate,
                endDate: event.endDate
            };
        }
    }


    selectState(state: MilestoneState) {
        this.milestoneForm.patchValue({ state });
    }

    selectUser(user: User | null) {
        this.milestoneForm.patchValue({ user_id: user?.id || null });
    }

    onSave() {
        if (this.milestoneForm.valid && this.dateRangeModel) {
            const formValue = this.milestoneForm.value;

            const updateData: Record<string, any> = {
                name      : formValue.name,
                started_at: this.dateRangeModel.startDate.format('YYYY-MM-DD'),
                due_at    : this.dateRangeModel.endDate.format('YYYY-MM-DD'),
                progress  : formValue.progress,
                state     : formValue.state,
                user_id   : formValue.user_id,
                comments   : formValue.comments,
            };

            if (!this.hasInvoiceItems) {
                updateData['workload_hours'] = formValue.workload_hours;
            }

            this.#milestoneService.update(Number(this.milestone.id), updateData)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: () => {
                        Toast.success($localize`:@@i18n.milestone.updated:Milestone updated successfully`);
                        Object.assign(this.milestone, updateData);
                        // Emit the updated milestone so parent can update it locally
                        this.updated.emit(this.milestone);
                        this.closed.emit();
                    },
                    error: (error:any) => {
                        Toast.error($localize`:@@i18n.milestone.updateError:Failed to update milestone`);
                        console.error('Error updating milestone:', error);
                    }
                });
        }
    }

    onCancel() {
        this.closed.emit();
    }

    onDeleteMilestone() {
        if (confirm($localize`:@@i18n.milestone.deleteConfirm:Are you sure you want to delete this milestone?`)) {
            this.milestone.delete()
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: () => {
                        Toast.success($localize`:@@i18n.milestone.deleted:Milestone deleted successfully`);
                        this.deleted.emit(this.milestone);
                        this.closed.emit();
                    },
                    error: (error) => {
                        Toast.error($localize`:@@i18n.milestone.deleteFailed:Failed to delete milestone`);
                        console.error('Error deleting milestone:', error);
                    }
                });
        }
    }

    // Position the popup fixed at top-left of screen
    getPopupStyle() {
        return {
            position: 'fixed',
            left: '5rem',
            top: '5rem',
            zIndex: 1000,
            display: this.visible ? 'block' : 'none'
        };
    }

    onAddTask() {
        this.#inputModalService.open($localize`:@@i18n.task.addTask:Add Task`)
            .then(result => {
                if (result?.text?.trim() && this.milestone?.id && this.project?.id) {
                    this.#projectService.createTaskForProject(this.project.id, {
                        name: result.text.trim(),
                        parent_type: 'App\\Models\\Milestone',
                        parent_id: this.milestone.id
                    }).pipe(takeUntil(this.destroy$))
                        .subscribe({
                            next: (newTask: Task) => {
                                Toast.success($localize`:@@i18n.task.created:Task created`);
                                // Add task to local array
                                if (!this.milestone.tasks) {
                                    this.milestone.tasks = [];
                                }
                                this.milestone.tasks.push(newTask);
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

    onDeleteTask(task: Task) {
        if (confirm($localize`:@@i18n.task.deleteConfirm:Are you sure you want to delete this task?`)) {
            task.delete()
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: () => {
                        Toast.success($localize`:@@i18n.task.deleted:Task deleted successfully`);
                        // Remove task from local array
                        if (this.milestone.tasks) {
                            this.milestone.tasks = this.milestone.tasks.filter(t => t.id !== task.id);
                        }
                    },
                    error: (error) => {
                        Toast.error($localize`:@@i18n.task.deleteFailed:Failed to delete task`);
                        console.error('Error deleting task:', error);
                    }
                });
        }
    }
}