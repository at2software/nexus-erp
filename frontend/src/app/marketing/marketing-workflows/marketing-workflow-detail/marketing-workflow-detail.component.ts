import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { MarketingService } from '@models/marketing/marketing.service';
import { MarketingWorkflow } from '@models/marketing/marketing-workflow.model';
import { MarketingActivity } from '@models/marketing/marketing-activity.model';
import { MarketingPerformanceMetric } from '@models/marketing/marketing-performance-metrics.model';
import { IActivityBase } from '@models/marketing/activity-base.interface';
import { Nx } from '@app/nx/nx.directive';
import { I18nTextareaComponent } from '@app/_shards/i18n-textarea/i18n-textarea.component';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { ActivityTableComponent } from '@app/marketing/shared/activity-table/activity-table.component';
import { Dictionary } from '@constants/constants';

// Expose MarketingActivity to template
const ActivityStatsColors = MarketingActivity.STATS_COLORS;

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'marketing-workflow-detail',
    templateUrl: './marketing-workflow-detail.component.html',
    styleUrl: './marketing-workflow-detail.component.scss',
    imports: [NgTemplateOutlet, FormsModule, RouterModule, Nx, NgbTooltipModule, ActivityTableComponent, I18nTextareaComponent, ScrollbarComponent, EmptyStateComponent],
})
export class MarketingWorkflowDetailComponent {
    #marketingService = inject(MarketingService);
    #route = inject(ActivatedRoute);
    #router = inject(Router);

    selectedWorkflow = signal<MarketingWorkflow | null>(null);
    availableMetrics = signal<MarketingPerformanceMetric[]>([]);

    // Expose colors to template
    readonly STATS_COLORS = ActivityStatsColors;

    // Activity management
    showActivityModal = signal(false);
    editingActivity: MarketingActivity | null = null;
    newActivity: Partial<MarketingActivity> = {
        name: '',
        day_offset: 1,
        description: '',
        is_required: true,
        quick_action: null,
    };

    constructor() {
        this.#marketingService.workflowActivitySaved$
            .pipe(takeUntilDestroyed())
            .subscribe((workflowId) => {
                if (String(this.#route.snapshot.params['id']) === workflowId) {
                    this.loadWorkflow(workflowId);
                }
            });
        this.#marketingService.indexMetrics().subscribe((metrics: MarketingPerformanceMetric[]) => {
            this.availableMetrics.set(metrics);
        });
        this.#route.params.pipe(takeUntilDestroyed()).subscribe((params) => {
            if (params['id']) {
                this.loadWorkflow(params['id']);
            }
        });
    }

    loadWorkflow(id: string) {
        this.#marketingService.showWorkflow(id).subscribe((workflow: MarketingWorkflow) => {
            this.selectedWorkflow.set(workflow);
            if (!this.#route.firstChild && workflow.marketing_activities?.length) {
                this.#router.navigate(['activity', workflow.marketing_activities[0].id], { relativeTo: this.#route });
            }
        });
    }

    // Activity Management
    createActivity() {
        const wf = this.selectedWorkflow();
        if (!wf || !this.newActivity.name) return;

        if (this.editingActivity) {
            this.#marketingService
                .updateWorkflowActivity(wf.id, this.editingActivity.id, {
                    name: this.newActivity.name,
                    day_offset: this.newActivity.day_offset!,
                    description: this.newActivity.description,
                    is_required: this.newActivity.is_required ?? true,
                    quick_action: this.newActivity.quick_action,
                    parent_activity_id: this.newActivity.parent_activity_id || null,
                })
                .subscribe(() => {
                    this.loadWorkflow(wf.id);
                    this.resetActivityForm();
                });
        } else {
            this.#marketingService
                .storeWorkflowActivity(wf.id, {
                    name: this.newActivity.name,
                    day_offset: this.newActivity.day_offset!,
                    description: this.newActivity.description || '',
                    is_required: this.newActivity.is_required ?? true,
                    quick_action: this.newActivity.quick_action,
                    parent_activity_id: this.newActivity.parent_activity_id || null,
                })
                .subscribe(() => {
                    this.loadWorkflow(wf.id);
                    this.resetActivityForm();
                });
        }
    }

    openEditActivityModal(activity: IActivityBase) {
        // Only handle MarketingActivity for workflow editing
        if (!('marketing_workflow_id' in activity) || !activity.marketing_workflow_id) {
            console.warn('Cannot edit initiative activities from workflow view');
            return;
        }

        this.editingActivity = activity as MarketingActivity;
        this.newActivity = {
            name: activity.name,
            day_offset: activity.day_offset,
            description: activity.description,
            is_required: activity.is_required,
            quick_action: activity.quick_action || null,
            parent_activity_id: activity.parent_activity_id || undefined,
        };
        this.showActivityModal.set(true);
    }

    deleteActivity(activity: MarketingActivity) {
        const wf = this.selectedWorkflow();
        if (!wf) return;
        if (!confirm(`Delete activity "${activity.name}"?`)) return;

        this.#marketingService.destroyWorkflowActivity(wf.id, activity.id).subscribe(() => this.loadWorkflow(wf.id));
    }

    resetActivityForm() {
        this.showActivityModal.set(false);
        this.editingActivity = null;
        this.newActivity = {
            name: '',
            day_offset: 1,
            description: '',
            is_required: true,
            quick_action: null,
            parent_activity_id: undefined,
        };
    }

    getRootActivities(): MarketingActivity[] {
        return this.selectedWorkflow()?.marketing_activities?.filter((a) => !a.parent_activity_id) ?? [];
    }

    getChildActivities(parentId: string): MarketingActivity[] {
        return this.selectedWorkflow()?.marketing_activities?.filter((a) => a.parent_activity_id === parentId) ?? [];
    }

    getAbsoluteDay(activity: MarketingActivity): number {
        if (!activity.parent_activity_id) return activity.day_offset;
        const parent = this.selectedWorkflow()?.marketing_activities?.find((a) => a.id === activity.parent_activity_id);
        return parent ? this.getAbsoluteDay(parent) + activity.day_offset : activity.day_offset;
    }

    onActivityActionResolved() {
        const wf = this.selectedWorkflow();
        if (wf) this.loadWorkflow(wf.id);
    }

    onDependencyAdded(event: { sourceId: string; targetId: string }) {
        const wf = this.selectedWorkflow();
        if (!wf) return;
        const targetActivity = wf.marketing_activities?.find((a) => a.id === event.targetId);
        if (!targetActivity) return;
        this.#marketingService.updateWorkflowActivity(wf.id, targetActivity.id, { parent_activity_id: event.sourceId }).subscribe({
            next: () => this.loadWorkflow(wf.id),
            error: () => alert('Failed to create dependency. Please try again.'),
        });
    }

    onDependencyRemoved(event: { activityId: string }) {
        const wf = this.selectedWorkflow();
        if (!wf) return;
        const activity = wf.marketing_activities?.find((a) => a.id === event.activityId);
        if (!activity || !activity.parent_activity_id) return;
        if (!confirm(`Remove dependency from "${activity.name}"?`)) return;
        this.#marketingService.updateWorkflowActivity(wf.id, activity.id, { parent_activity_id: null }).subscribe({
            next: () => this.loadWorkflow(wf.id),
            error: () => alert('Failed to remove dependency. Please try again.'),
        });
    }

    getQuickActionIcon(qa: string): string {
        const icons: Dictionary<string> = { EMAIL: 'email', LINKEDIN: 'open_in_new', LINKEDIN_SEARCH: 'search', CALL: 'phone' };
        return icons[qa] || '';
    }
}
