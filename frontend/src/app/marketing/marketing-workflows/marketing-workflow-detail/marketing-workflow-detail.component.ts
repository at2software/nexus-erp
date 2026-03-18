import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { NgApexchartsModule } from 'ng-apexcharts';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { MarketingService } from '@models/marketing/marketing.service';
import { MarketingWorkflow } from '@models/marketing/marketing-workflow.model';
import { MarketingActivity } from '@models/marketing/marketing-activity.model';
import { MarketingInitiativeActivity } from '@models/marketing/marketing-initiative-activity.model';
import { IActivityBase } from '@models/marketing/activity-base.interface';
import { NexusModule } from 'src/app/nx/nexus.module';
import { Color } from 'src/constants/Color';
import { I18nTextareaComponent } from '@app/_shards/i18n-textarea/i18n-textarea.component';
import { ScrollbarComponent } from "@app/app/scrollbar/scrollbar.component";
import { ActivityTableComponent } from '@app/marketing/shared/activity-table/activity-table.component';

// Expose MarketingActivity to template
const ActivityStatsColors = MarketingActivity.STATS_COLORS;

@Component({
    selector: 'marketing-workflow-detail',
    templateUrl: './marketing-workflow-detail.component.html',
    styleUrl: './marketing-workflow-detail.component.scss',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, NexusModule, NgbTooltipModule, NgApexchartsModule, ActivityTableComponent, I18nTextareaComponent, ScrollbarComponent, EmptyStateComponent]
})
export class MarketingWorkflowDetailComponent implements OnInit {
    #marketingService = inject(MarketingService);
    #route = inject(ActivatedRoute);

    selectedWorkflow: MarketingWorkflow | null = null;
    workflowStats: any = null;
    pieChartOptions: any = null;

    // Expose colors to template
    readonly STATS_COLORS = ActivityStatsColors;

    // Activity management
    showActivityModal = false;
    editingActivity: MarketingActivity | null = null;
    newActivity: Partial<MarketingActivity> = {
        name: '',
        day_offset: 1,
        description: '',
        is_required: true,
        quick_action: null
    };

    ngOnInit() {
        this.#route.params.subscribe(params => {
            if (params['id']) {
                this.loadWorkflow(params['id']);
            }
        });
    }

    loadWorkflow(id: string) {
        this.#marketingService.showWorkflow(id)
            .subscribe((workflow: MarketingWorkflow) => {
                this.selectedWorkflow = workflow;
                this.#loadWorkflowStats(id);
                this.#buildPieChart(workflow);
            });
    }

    #buildPieChart(workflow: MarketingWorkflow) {
        if (!workflow.prospect_stats || workflow.prospect_stats.total === 0) {
            this.pieChartOptions = null;
            return;
        }

        const stats = workflow.prospect_stats;

        this.pieChartOptions = {
            series: [stats.new, stats.engaged, stats.unresponsive, stats.converted],
            chart: {
                type: 'donut',
                height: 200,
            },
            labels: ['New', 'Engaged', 'Unresponsive', 'Converted'],
            colors: [
                Color.fromVar('info').toHexString(),
                Color.fromVar('primary').toHexString(),
                Color.fromVar('danger').toHexString(),
                Color.fromVar('success').toHexString()
            ],
            legend: {
                show: false,
            },
            dataLabels: {
                enabled: true,
                formatter: function (val: number) {
                    return Math.round(val) + '%';
                }
            },
            stroke: {
                show: true,
                width: 2,
                colors: '#111'
            },
            plotOptions: {
                pie: {
                    donut: {
                        size: '65%'
                    }
                }
            }
        };
    }

    #loadWorkflowStats(id: string) {
        this.#marketingService.showWorkflowStats(id)
            .subscribe((stats: any) => {
                this.workflowStats = stats;
            });
    }

    // Activity Management
    createActivity() {
        if (!this.selectedWorkflow || !this.newActivity.name) return;

        if (this.editingActivity) {
            // Update existing activity
            // description can be either string or array of i18n objects - backend cast handles both
            this.#marketingService.updateWorkflowActivity(
                this.selectedWorkflow.id,
                this.editingActivity.id,
                {
                    name: this.newActivity.name,
                    day_offset: this.newActivity.day_offset!,
                    description: this.newActivity.description,
                    is_required: this.newActivity.is_required ?? true,
                    quick_action: this.newActivity.quick_action,
                    parent_activity_id: this.newActivity.parent_activity_id || null
                }
            ).subscribe(() => {
                this.loadWorkflow(this.selectedWorkflow!.id);
                this.resetActivityForm();
            });
        } else {
            // Create new activity
            this.#marketingService.storeWorkflowActivity(this.selectedWorkflow.id, {
                name: this.newActivity.name,
                day_offset: this.newActivity.day_offset!,
                description: this.newActivity.description || '',
                is_required: this.newActivity.is_required ?? true,
                quick_action: this.newActivity.quick_action,
                parent_activity_id: this.newActivity.parent_activity_id || null
            }).subscribe(() => {
                this.loadWorkflow(this.selectedWorkflow!.id);
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
            parent_activity_id: activity.parent_activity_id || undefined
        };
        this.showActivityModal = true;
    }

    deleteActivity(activity: MarketingActivity) {
        if (!this.selectedWorkflow) return;
        if (!confirm(`Delete activity "${activity.name}"?`)) return;

        this.#marketingService.destroyWorkflowActivity(this.selectedWorkflow.id, activity.id)
            .subscribe(() => this.loadWorkflow(this.selectedWorkflow!.id));
    }

    resetActivityForm() {
        this.showActivityModal = false;
        this.editingActivity = null;
        this.newActivity = {
            name: '',
            day_offset: 1,
            description: '',
            is_required: true,
            quick_action: null,
            parent_activity_id: undefined
        };
    }

    // Get root activities (no parent)
    getRootActivities(): MarketingActivity[] {
        if (!this.selectedWorkflow?.marketing_activities) return [];
        return this.selectedWorkflow.marketing_activities.filter(a => !a.parent_activity_id);
    }

    // Get child activities for a given parent
    getChildActivities(parentId: string): MarketingActivity[] {
        if (!this.selectedWorkflow?.marketing_activities) return [];
        return this.selectedWorkflow.marketing_activities.filter(a => a.parent_activity_id === parentId);
    }

    // Calculate absolute day for an activity (considering parent offsets)
    getAbsoluteDay(activity: MarketingActivity): number {
        if (!activity.parent_activity_id) {
            return activity.day_offset;
        }

        const parent = this.selectedWorkflow?.marketing_activities?.find(a => a.id === activity.parent_activity_id);
        if (!parent) {
            return activity.day_offset;
        }

        return this.getAbsoluteDay(parent) + activity.day_offset;
    }

    // Handle activity actions completion (e.g., after deletion)
    onActivityActionResolved() {
        console.log('Activity action resolved, reloading workflow');
        if (this.selectedWorkflow) {
            this.loadWorkflow(this.selectedWorkflow.id);
        }
    }

    // Handle dependency creation from flowchart
    onDependencyAdded(event: {sourceId: string, targetId: string}) {
        if (!this.selectedWorkflow) return;

        const targetActivity = this.selectedWorkflow.marketing_activities?.find(a => a.id === event.targetId);
        if (!targetActivity) return;

        // Update the activity's parent_activity_id
        this.#marketingService.updateWorkflowActivity(
            this.selectedWorkflow.id,
            targetActivity.id,
            { parent_activity_id: event.sourceId }
        ).subscribe({
            next: () => {
                this.loadWorkflow(this.selectedWorkflow!.id);
            },
            error: (err) => {
                console.error('Failed to create dependency:', err);
                alert('Failed to create dependency. Please try again.');
            }
        });
    }

    // Handle dependency removal from flowchart
    onDependencyRemoved(event: {activityId: string}) {
        if (!this.selectedWorkflow) return;

        const activity = this.selectedWorkflow.marketing_activities?.find(a => a.id === event.activityId);
        if (!activity || !activity.parent_activity_id) return;

        if (!confirm(`Remove dependency from "${activity.name}"?`)) return;

        // Clear the activity's parent_activity_id
        this.#marketingService.updateWorkflowActivity(
            this.selectedWorkflow.id,
            activity.id,
            { parent_activity_id: null }
        ).subscribe({
            next: () => {
                this.loadWorkflow(this.selectedWorkflow!.id);
            },
            error: (err) => {
                console.error('Failed to remove dependency:', err);
                alert('Failed to remove dependency. Please try again.');
            }
        });
    }

    getQuickActionIcon(qa: string): string {
        const icons: Record<string, string> = { EMAIL: 'email', LINKEDIN: 'open_in_new', LINKEDIN_SEARCH: 'search', CALL: 'phone' };
        return icons[qa] || '';
    }
}
