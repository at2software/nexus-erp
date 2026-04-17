import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { map } from 'rxjs';
import { MarketingService } from '@models/marketing/marketing.service';
import { MarketingInitiative } from '@models/marketing/marketing-initiative.model';
import { MarketingPerformanceMetric } from '@models/marketing/marketing-performance-metrics.model';
import { MarketingWorkflow } from '@models/marketing/marketing-workflow.model';
import { MarketingActivity } from '@models/marketing/marketing-activity.model';
import { MarketingInitiativeActivity } from '@models/marketing/marketing-initiative-activity.model';
import { IActivityBase } from '@models/marketing/activity-base.interface';
import { LeadSource } from '@models/project/lead_source.model';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { NxGlobal } from 'src/app/nx/nx.global';
import { NexusModule } from '@app/nx/nexus.module';
import { AvatarComponent } from '@app/_shards/avatar/avatar.component';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { NgApexchartsModule } from 'ng-apexcharts';
import { HotkeyDirective } from 'src/directives/hotkey.directive';
import { Color } from 'src/constants/Color';
import { ActivityTableComponent } from '@app/marketing/shared/activity-table/activity-table.component';
import { I18nTextareaComponent } from '@app/_shards/i18n-textarea/i18n-textarea.component';

const ActivityStatsColors = MarketingActivity.STATS_COLORS;

@Component({
    selector: 'marketing-initiative-detail',
    imports: [CommonModule, FormsModule, ToolbarComponent, NexusModule, AvatarComponent, NgbTooltipModule, NgApexchartsModule, HotkeyDirective, ActivityTableComponent, I18nTextareaComponent, RouterModule],
    templateUrl: './marketing-initiative-detail.component.html',
    styleUrl: './marketing-initiative-detail.component.scss'
})
export class MarketingInitiativeDetailComponent implements OnInit {

    #route = inject(ActivatedRoute);
    #router = inject(Router);
    #marketingService = inject(MarketingService);

    readonly STATS_COLORS = ActivityStatsColors;

    initiative?: MarketingInitiative;
    isLoading = true;
    chartOptions: any = null;
    donutChartOptions: any = null;

    // Channel assignment
    showChannelModal = false;
    selectedChannelId: string = '';
    isPrimaryChannel = false;
    availableLeadSources: LeadSource[] = [];

    // Workflow selection
    showWorkflowModal = false;
    availableWorkflows: MarketingWorkflow[] = [];
    selectedWorkflowId: string = '';

    // Metric selection
    showMetricModal = false;
    availableMetrics: MarketingPerformanceMetric[] = [];
    selectedMetricId: string = '';
    metricTargetValue?: number;

    // Activity editing
    showActivityModal = false;
    editingActivity: MarketingInitiativeActivity | null = null;
    newActivity: Partial<MarketingInitiativeActivity> = {
        name: '',
        day_offset: 1,
        description: '',
        is_required: true,
        quick_action: null
    };

    ngOnInit() {
        this.loadLeadSources();
        this.loadWorkflows();
        this.loadMetrics();

        this.#route.params.subscribe(params => {
            if (params['id']) {
                this.loadInitiative(params['id']);
            }
        });
    }

    loadLeadSources() {
        this.availableLeadSources = NxGlobal.global.lead_sources;
    }

    loadWorkflows() {
        this.#marketingService.indexWorkflows()
            .subscribe((workflows: MarketingWorkflow[]) => {
                this.availableWorkflows = workflows;
            });
    }

    loadMetrics() {
        this.#marketingService.indexMetrics()
            .subscribe((metrics: MarketingPerformanceMetric[]) => {
                this.availableMetrics = metrics;
            });
    }

    loadInitiative(id: string) {
        this.isLoading = true;
        this.#marketingService.showInitiative(id)
            .subscribe((initiative: MarketingInitiative) => {
                this.initiative = initiative;
                this.isLoading = false;
                this.#loadInitiativeStats(id);
            });
    }

    #loadInitiativeStats(id: string) {
        this.#marketingService.showInitiativeStats(id)
            .subscribe((stats: any) => {
                this.#buildChart(stats.timeline);
                const actStats = stats.activities ?? stats.activity_stats ?? stats.initiative_activities ?? stats.per_activity;
                if (actStats && this.initiative?.initiative_activities) {
                    this.#applyActivityStats(actStats);
                }
            });
    }

    #buildChart(timeline: any[]) {
        if (!timeline || timeline.length === 0) {
            this.chartOptions = null;
            this.donutChartOptions = null;
            return;
        }

        const primaryColor = '#00c9a7';
        const totalData = timeline.map(t => [
            t.timestamp,
            (t.new || 0) + (t.engaged || 0) + (t.unresponsive || 0) + (t.converted || 0)
        ]);

        this.chartOptions = {
            series: [{ name: 'Prospects', data: totalData }],
            chart: {
                type: 'area',
                height: 90,
                background: 'transparent',
                toolbar: { show: false },
                zoom: { enabled: false },
                animations: { enabled: false },
            },
            theme: { mode: 'dark' },
            colors: [primaryColor],
            stroke: { show: true, width: 2, curve: 'smooth', colors: [primaryColor] },
            fill: {
                type: 'gradient',
                gradient: { shadeIntensity: 0.1, opacityFrom: 0.25, opacityTo: 0, stops: [0, 100] }
            },
            grid: {
                borderColor: '#ffffff10',
                padding: { left: 5, right: 5, top: 0, bottom: 0 }
            },
            xaxis: {
                type: 'datetime',
                labels: { show: false },
                axisBorder: { show: false },
                axisTicks: { show: false }
            },
            yaxis: { show: false, min: 0 },
            legend: { show: false },
            dataLabels: { enabled: false },
            tooltip: {
                enabled: true,
                theme: 'dark',
                shared: true,
                intersect: false,
                x: { show: true, format: 'yyyy.MM.dd' }
            }
        };

        const latest = timeline[timeline.length - 1];
        const totalNew = latest.new || 0;
        const totalEngaged = latest.engaged || 0;
        const totalUnresponsive = latest.unresponsive || 0;
        const totalConverted = latest.converted || 0;

        this.donutChartOptions = {
            series: [totalNew, totalEngaged, totalUnresponsive, totalConverted],
            chart: { type: 'donut', height: 100, width: 100 },
            labels: ['New', 'Engaged', 'Unresponsive', 'Converted'],
            colors: [
                Color.fromVar('info').toHexString(),
                Color.fromVar('warning').toHexString(),
                Color.fromVar('danger').toHexString(),
                Color.fromVar('success').toHexString()
            ],
            legend: { show: false },
            dataLabels: { enabled: false },
            stroke: { show: true, width: 2, colors: ['#111'] },
            plotOptions: { pie: { donut: { size: '70%' } } },
            tooltip: {
                y: {
                    formatter: (value: number) => {
                        const total = totalNew + totalEngaged + totalUnresponsive + totalConverted;
                        return `${value} (${total > 0 ? ((value / total) * 100).toFixed(1) : 0}%)`;
                    }
                }
            }
        };
    }

    #applyActivityStats(activityStats: any) {
        const isArray = Array.isArray(activityStats);
        for (const activity of this.initiative!.initiative_activities!) {
            const s = isArray
                ? activityStats.find((a: any) => String(a.id) === String(activity.id))
                : activityStats[activity.id];
            if (s) activity.stats = s;
        }
    }

    isCurrentUserSubscribed(): boolean {
        const currentUserId = NxGlobal.global.user?.id;
        return this.initiative?.users?.some(u => u.id === currentUserId) || false;
    }

    subscribe() {
        if (!this.initiative || !NxGlobal.global.user) return;

        this.#marketingService.subscribeToInitiative(this.initiative.id, NxGlobal.global.user.id)
            .subscribe(() => {
                if (this.initiative) {
                    this.loadInitiative(this.initiative.id);
                }
            });
    }

    unsubscribe() {
        if (!this.initiative || !NxGlobal.global.user) return;
        if (!confirm('Unsubscribe from this initiative?')) return;

        this.#marketingService.unsubscribeFromInitiative(this.initiative.id, NxGlobal.global.user.id.toString())
            .subscribe(() => {
                if (this.initiative) {
                    this.loadInitiative(this.initiative.id);
                }
            });
    }

    getStatusBadgeClass(status: string): string {
        switch (status) {
            case 'active': return 'bg-success';
            case 'paused': return 'bg-warning';
            case 'completed': return 'bg-primary';
            default: return 'bg-secondary';
        }
    }

    getAllMetrics(): MarketingPerformanceMetric[] {
        return this.initiative?.performance_metrics || [];
    }

    removeChannel(channelId: number) {
        if (!this.initiative) return;
        if (!confirm('Remove this channel from the initiative?')) return;

        this.#marketingService.removeInitiativeChannel(this.initiative.id, channelId)
            .subscribe(() => {
                if (this.initiative) {
                    this.loadInitiative(this.initiative.id.toString());
                }
            });
    }

    openWorkflowEditor(workflowId: string) {
        this.#router.navigate(['/marketing/workflows'], {
            queryParams: { workflowId }
        });
    }

    // Channel Management
    assignChannel() {
        if (!this.initiative || !this.selectedChannelId) return;

        this.#marketingService.assignInitiativeChannel(
            this.initiative.id,
            parseInt(this.selectedChannelId),
            this.isPrimaryChannel
        ).subscribe(() => {
            if (this.initiative) {
                this.loadInitiative(this.initiative.id.toString());
            }
            this.resetChannelForm();
        });
    }

    resetChannelForm() {
        this.selectedChannelId = '';
        this.isPrimaryChannel = false;
        this.showChannelModal = false;
    }

    // Workflow Management
    attachWorkflow() {
        if (!this.initiative || !this.selectedWorkflowId) return;

        this.#marketingService.attachWorkflowToInitiative(this.initiative.id, {
            marketing_workflow_id: this.selectedWorkflowId,
            is_active: true
        }).subscribe((workflows: any) => {
            if (this.initiative) {
                this.initiative.workflows = workflows;
            }
            this.resetWorkflowForm();
        });
    }

    resetWorkflowForm() {
        this.selectedWorkflowId = '';
        this.showWorkflowModal = false;
    }

    // Metric Management
    attachMetric() {
        if (!this.initiative || !this.selectedMetricId) return;

        this.#marketingService.attachMetricToInitiative(
            this.initiative.id,
            {
                metric_id: this.selectedMetricId,
                target_value: this.metricTargetValue
            }
        ).pipe(
            map(() => this.availableMetrics.find(m => m.id === this.selectedMetricId)!)
        ).subscribe((metric: MarketingPerformanceMetric) => {
            if (this.initiative && metric) {
                metric.pivot = {
                    target_value: this.metricTargetValue,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                const metrics = this.initiative.performance_metrics || [];
                metrics.push(metric);
                this.initiative.performance_metrics = metrics;
            }
            this.resetMetricForm();
        });
    }

    resetMetricForm() {
        this.selectedMetricId = '';
        this.metricTargetValue = undefined;
        this.showMetricModal = false;
    }

    openEditInitiativeActivityModal(activity: IActivityBase) {
        // Only handle MarketingInitiativeActivity
        if (!('marketing_initiative_id' in activity)) {
            console.warn('Cannot edit workflow activities from initiative view');
            return;
        }
        
        this.editingActivity = activity as MarketingInitiativeActivity;
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

    saveInitiativeActivity() {
        if (!this.initiative || !this.newActivity.name || !this.editingActivity) return;

        this.#marketingService.updateInitiativeActivity(
            this.initiative.id,
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
            this.loadInitiative(this.initiative!.id);
            this.resetActivityForm();
        });
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
}
