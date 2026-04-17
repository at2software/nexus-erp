import { Component, inject, input, output, signal, computed, effect } from '@angular/core';
import { DecimalPipe } from '@angular/common';
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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
        DecimalPipe,
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
export class MilestonePopupComponent extends BaseComponent {
    milestone = input.required<Milestone>();
    project   = input<Project>();
    position  = input<{ x: number; y: number }>({ x: 0, y: 0 });
    visible   = input<boolean>(false);

    closed  = output<void>();
    updated = output<Milestone>();
    deleted = output<Milestone>();

    milestoneStates = MILESTONE_STATES;
    MilestoneState  = MilestoneState;

    projectUsers   = signal<User[]>([]);
    dateRangeModel = signal<{ startDate: any; endDate: any } | null>(null);
    milestoneForm!: FormGroup;

    readonly dateRanges: any = {
        'Today'     : [moment(), moment()],
        'Tomorrow'  : [moment().add(1, 'day'), moment().add(1, 'day')],
        'This Week' : [moment(), moment().add(6, 'day')],
        'Next Week' : [moment().add(7, 'day'), moment().add(13, 'day')]
    };

    readonly hasInvoiceItems = computed(() => !!this.milestone()?.invoice_items?.length);

    readonly totalInvoiceItemDuration = computed(() => {
        const items = this.milestone()?.invoice_items;
        if (!Array.isArray(items)) return 0;
        return items.reduce((total, item) => total + (item.qty || 0), 0);
    });

    #formBuilder       = inject(FormBuilder);
    #milestoneService  = inject(MilestoneService);
    #projectService    = inject(ProjectService);
    #inputModalService = inject(InputModalService);
    #taskService       = inject(TaskService);

    constructor() {
        super();

        effect(() => {
            const project = this.project();
            if (project) {
                this.projectUsers.set(project.getAssignedUsers().map(a => a.assignee as User));
            }
        });

        effect(() => {
            const milestone = this.milestone();
            if (milestone) this.#initializeForm(milestone);
        });
    }

    #initializeForm(milestone: Milestone) {
        milestone.tasks.forEach(task => task.httpService = this.#taskService);

        this.dateRangeModel.set(
            milestone.started_at && milestone.due_at
                ? { startDate: milestone.time_started(), endDate: milestone.time_due() }
                : null
        );

        const value = {
            name           : milestone.name || '',
            comments       : milestone.comments || '',
            progress       : milestone.progress || 0,
            state          : milestone.state || MilestoneState.TODO,
            user_id        : milestone.user_id,
            workload_hours : milestone.workload_hours
        };

        if (this.milestoneForm) {
            this.milestoneForm.patchValue(value);
        } else {
            this.milestoneForm = this.#formBuilder.group({
                name           : [value.name, [Validators.required, Validators.minLength(1)]],
                comments       : [value.comments],
                progress       : [value.progress, [Validators.min(0), Validators.max(1)]],
                state          : [value.state],
                user_id        : [value.user_id],
                workload_hours : [value.workload_hours, [Validators.min(0)]]
            });
        }
    }

    getSelectedUser(): User | null {
        const userId = this.milestoneForm?.get('user_id')?.value;
        if (!userId) return null;
        return this.projectUsers().find(u => u.id === userId) ?? null;
    }

    onDateRangeChange(event: any) {
        if (event.startDate && event.endDate) {
            this.dateRangeModel.set({ startDate: event.startDate, endDate: event.endDate });
        }
    }

    selectState(state: MilestoneState) {
        this.milestoneForm.patchValue({ state });
    }

    selectUser(user: User | null) {
        this.milestoneForm.patchValue({ user_id: user?.id ?? null });
    }

    onSave() {
        if (!this.milestoneForm.valid) return;

        const { name, progress, state, user_id, comments, workload_hours } = this.milestoneForm.value;
        const milestone  = this.milestone();
        const dateRange  = this.dateRangeModel();

        const updateData: Record<string, any> = { name, progress, state, user_id, comments };
        if (dateRange) {
            updateData['started_at'] = dateRange.startDate.format('YYYY-MM-DD');
            updateData['due_at']     = dateRange.endDate.format('YYYY-MM-DD');
        }
        if (!this.hasInvoiceItems()) {
            updateData['workload_hours'] = workload_hours;
        }

        this.#milestoneService.update(Number(milestone.id), updateData)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    Toast.success($localize`:@@i18n.milestone.updated:Milestone updated successfully`);
                    Object.assign(milestone, updateData);
                    this.updated.emit(milestone);
                    this.closed.emit();
                },
                error: (error: any) => {
                    Toast.error($localize`:@@i18n.milestone.updateError:Failed to update milestone`);
                    console.error('Error updating milestone:', error);
                }
            });
    }

    onCancel() {
        this.closed.emit();
    }

    onDeleteMilestone() {
        if (!confirm($localize`:@@i18n.milestone.deleteConfirm:Are you sure you want to delete this milestone?`)) return;
        const milestone = this.milestone();
        milestone.delete()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    Toast.success($localize`:@@i18n.milestone.deleted:Milestone deleted successfully`);
                    this.deleted.emit(milestone);
                    this.closed.emit();
                },
                error: (error: any) => {
                    Toast.error($localize`:@@i18n.milestone.deleteFailed:Failed to delete milestone`);
                    console.error('Error deleting milestone:', error);
                }
            });
    }

    onAddTask() {
        this.#inputModalService.open($localize`:@@i18n.task.addTask:Add Task`)
            .then(result => {
                const milestone = this.milestone();
                if (!result?.text?.trim() || !milestone?.id || !this.project()?.id) return;
                this.#projectService.createTaskForProject(this.project()!.id, {
                    name        : result.text.trim(),
                    parent_type : 'App\\Models\\Milestone',
                    parent_id   : milestone.id
                }).pipe(takeUntilDestroyed(this.destroyRef))
                    .subscribe({
                        next: (newTask: Task) => {
                            Toast.success($localize`:@@i18n.task.created:Task created`);
                            milestone.tasks ??= [];
                            milestone.tasks.push(newTask);
                        },
                        error: (error: any) => {
                            Toast.error($localize`:@@i18n.task.createError:Failed to create task`);
                            console.error('Error creating task:', error);
                        }
                    });
            })
            .catch(() => {
                // Modal dismissed, do nothing
            });
    }

    onDeleteTask(task: Task) {
        if (!confirm($localize`:@@i18n.task.deleteConfirm:Are you sure you want to delete this task?`)) return;
        task.delete()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    Toast.success($localize`:@@i18n.task.deleted:Task deleted successfully`);
                    const milestone = this.milestone();
                    if (milestone.tasks) {
                        milestone.tasks = milestone.tasks.filter(t => t.id !== task.id);
                    }
                },
                error: (error: any) => {
                    Toast.error($localize`:@@i18n.task.deleteFailed:Failed to delete task`);
                    console.error('Error deleting task:', error);
                }
            });
    }
}
