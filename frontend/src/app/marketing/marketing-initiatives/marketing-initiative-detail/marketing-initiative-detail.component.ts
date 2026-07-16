import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { map } from 'rxjs';
import { MarketingService } from '@models/marketing/marketing.service';
import { MarketingInitiative } from '@models/marketing/marketing-initiative.model';
import { MarketingPerformanceMetric } from '@models/marketing/marketing-performance-metrics.model';
import { MarketingWorkflow } from '@models/marketing/marketing-workflow.model';
import { MarketingActivity } from '@models/marketing/marketing-activity.model';
import { LeadSource } from '@models/project/lead_source.model';
import { NxGlobal } from '@app/nx/nx.global';
import { Nx } from '@app/nx/nx.directive';
import { AvatarComponent } from '@app/_shards/avatar/avatar.component';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { EchartsComponent } from '@charts/echarts-wrapper/echarts-wrapper.component';
import { HotkeyDirective } from '@directives/hotkey.directive';
import { Color } from '@constants/Color';
import { ECHARTS_DONUT_ITEM_STYLE } from '@charts/echarts-presets';
import { ActivityTableComponent } from '@app/marketing/shared/activity-table/activity-table.component';
import { SpinnerComponent } from '@shards/spinner/spinner.component';
import type { EChartsOption } from 'echarts';
import { ActivityStatsMap, InitiativeTimelineEntry } from '@models/api-response';

const ActivityStatsColors = MarketingActivity.STATS_COLORS;

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'marketing-initiative-detail',
    imports: [DatePipe, FormsModule, Nx, AvatarComponent, NgbTooltipModule, EchartsComponent, HotkeyDirective, ActivityTableComponent, RouterModule, SpinnerComponent],
    templateUrl: './marketing-initiative-detail.component.html',
    styleUrl: './marketing-initiative-detail.component.scss',
})
export class MarketingInitiativeDetailComponent {
    #route = inject(ActivatedRoute);
    #router = inject(Router);
    #marketingService = inject(MarketingService);
    #cd = inject(ChangeDetectorRef);

    readonly STATS_COLORS = ActivityStatsColors;

    initiative = signal<MarketingInitiative | undefined>(undefined);
    isLoading = signal(true);
    chartOptions = signal<EChartsOption | null>(null);
    donutChartOptions = signal<EChartsOption | null>(null);

    readonly isSubscribed = computed(() => this.initiative()?.users?.some((u) => u.id === NxGlobal.global.user?.id) ?? false);

    // Channel assignment
    showChannelModal = signal(false);
    selectedChannelId: string = '';
    isPrimaryChannel = signal(false);
    availableLeadSources: LeadSource[] = [];

    // Workflow selection
    showWorkflowModal = signal(false);
    availableWorkflows = signal<MarketingWorkflow[]>([]);
    selectedWorkflowId: string = '';

    // Metric selection
    showMetricModal = signal(false);
    availableMetrics = signal<MarketingPerformanceMetric[]>([]);
    selectedMetricId: string = '';
    metricTargetValue?: number;


    constructor() {
        this.loadLeadSources();
        this.loadWorkflows();
        this.loadMetrics();
        this.#route.params.subscribe((params) => {
            if (params['id']) {
                this.loadInitiative(params['id']);
            }
        });
        this.#marketingService.initiativeActivitySaved$
            .pipe(takeUntilDestroyed())
            .subscribe((initiativeId) => {
                if (String(this.#route.snapshot.params['id']) === initiativeId) {
                    this.loadInitiative(initiativeId);
                }
            });
    }

    loadLeadSources() {
        this.availableLeadSources = NxGlobal.global.lead_sources();
    }

    loadWorkflows() {
        this.#marketingService.indexWorkflows().subscribe((workflows: MarketingWorkflow[]) => {
            this.availableWorkflows.set(workflows);
        });
    }

    loadMetrics() {
        this.#marketingService.indexMetrics().subscribe((metrics: MarketingPerformanceMetric[]) => {
            this.availableMetrics.set(metrics);
        });
    }

    loadInitiative(id: string) {
        this.isLoading.set(true);
        this.#marketingService.showInitiative(id).subscribe({
            next: (initiative: MarketingInitiative) => {
                this.initiative.set(initiative);
                this.isLoading.set(false);
                this.#loadInitiativeStats(id);
                if (!this.#route.firstChild && initiative.initiative_activities?.length) {
                    this.#router.navigate(['activity', initiative.initiative_activities[0].id], { relativeTo: this.#route });
                }
            },
            error: () => this.isLoading.set(false),
        });
    }

    #loadInitiativeStats(id: string) {
        this.#marketingService.showInitiativeStats(id).subscribe((stats) => {
            this.#buildChart(stats.timeline);
            const actStats = stats.activities ?? stats.activity_stats ?? stats.initiative_activities ?? stats.per_activity;
            if (actStats && this.initiative()?.initiative_activities) {
                this.#applyActivityStats(actStats);
            }
        });
    }

    #buildChart(timeline: InitiativeTimelineEntry[]) {
        if (!timeline || timeline.length === 0) {
            this.chartOptions.set(null);
            this.donutChartOptions.set(null);
            return;
        }

        const primaryColor = '#00c9a7';
        const totalData = timeline.map((t) => [t.timestamp, (t.new || 0) + (t.engaged || 0) + (t.unresponsive || 0) + (t.converted || 0)]);

        this.chartOptions.set({
            chart: { height: 90 },
            backgroundColor: 'transparent',
            animation: false,
            grid: { left: 5, right: 5, top: 0, bottom: 0 },
            xAxis: { type: 'time', show: false },
            yAxis: { type: 'value', show: false, min: 0 },
            tooltip: { trigger: 'axis', formatter: (rawParams: unknown) => {
                const params = rawParams as { value: [number, number] }[];
                return new Date(params[0]?.value[0]).toLocaleDateString() + ': ' + params[0]?.value[1];
            } },
            series: [
                {
                    name: 'Prospects',
                    type: 'line',
                    symbol: 'none',
                    smooth: true,
                    data: totalData,
                    lineStyle: { width: 2, color: primaryColor },
                    itemStyle: { color: primaryColor },
                    areaStyle: {
                        color: {
                            type: 'linear',
                            x: 0,
                            y: 0,
                            x2: 0,
                            y2: 1,
                            colorStops: [
                                { offset: 0, color: primaryColor + '40' },
                                { offset: 1, color: primaryColor + '00' },
                            ],
                        },
                    },
                },
            ],
        });

        const latest = timeline[timeline.length - 1];
        const totalNew = latest.new || 0;
        const totalEngaged = latest.engaged || 0;
        const totalUnresponsive = latest.unresponsive || 0;
        const totalConverted = latest.converted || 0;
        const total = totalNew + totalEngaged + totalUnresponsive + totalConverted;

        this.donutChartOptions.set({
            chart: { height: 100, width: 100 },
            backgroundColor: 'transparent',
            animation: false,
            tooltip: { trigger: 'item', formatter: (rawParams: unknown) => {
                const p = rawParams as { name: string; value: number };
                return `${p.name}: ${p.value} (${total > 0 ? ((p.value / total) * 100).toFixed(1) : 0}%)`;
            } },
            series: [
                {
                    type: 'pie',
                    radius: ['35%', '65%'],
                    data: [
                        { value: totalNew, name: 'New', itemStyle: { color: Color.fromVar('info').toHexString(), ...ECHARTS_DONUT_ITEM_STYLE } },
                        { value: totalEngaged, name: 'Engaged', itemStyle: { color: Color.fromVar('warning').toHexString(), ...ECHARTS_DONUT_ITEM_STYLE } },
                        { value: totalUnresponsive, name: 'Unresponsive', itemStyle: { color: Color.fromVar('danger').toHexString(), ...ECHARTS_DONUT_ITEM_STYLE } },
                        { value: totalConverted, name: 'Converted', itemStyle: { color: Color.fromVar('success').toHexString(), ...ECHARTS_DONUT_ITEM_STYLE } },
                    ],
                    label: { show: false },
                },
            ],
        });
    }

    #applyActivityStats(activityStats: ActivityStatsMap) {
        const initiative = this.initiative()!;
        for (const activity of initiative.initiative_activities!) {
            const s = Array.isArray(activityStats) ? activityStats.find((a) => String(a.id) === String(activity.id)) : activityStats[activity.id];
            if (s) activity.stats = s;
        }
        initiative.initiative_activities = [...initiative.initiative_activities!];
        this.initiative.update((current) => Object.assign(Object.create(Object.getPrototypeOf(current)), current));
        this.#cd.markForCheck();
    }

    subscribe() {
        const initiative = this.initiative();
        if (!initiative || !NxGlobal.global.user) return;

        this.#marketingService.subscribeToInitiative(initiative.id, NxGlobal.global.user.id).subscribe(() => {
            if (this.initiative()) {
                this.loadInitiative(initiative.id);
            }
        });
    }

    unsubscribe() {
        const initiative = this.initiative();
        if (!initiative || !NxGlobal.global.user) return;
        if (!confirm('Unsubscribe from this initiative?')) return;

        this.#marketingService.unsubscribeFromInitiative(initiative.id, NxGlobal.global.user.id.toString()).subscribe(() => {
            if (this.initiative()) {
                this.loadInitiative(initiative.id);
            }
        });
    }

    getStatusBadgeClass(status: string): string {
        switch (status) {
            case 'active':
                return 'bg-success';
            case 'paused':
                return 'bg-warning';
            case 'completed':
                return 'bg-primary';
            default:
                return 'bg-secondary';
        }
    }

    removeChannel(channelId: number) {
        const initiative = this.initiative();
        if (!initiative) return;
        if (!confirm('Remove this channel from the initiative?')) return;

        this.#marketingService.removeInitiativeChannel(initiative.id, channelId).subscribe(() => {
            if (this.initiative()) {
                this.loadInitiative(initiative.id.toString());
            }
        });
    }

    openWorkflowEditor(workflowId: string) {
        this.#router.navigate(['/marketing/workflows'], {
            queryParams: { workflowId },
        });
    }

    // Channel Management
    assignChannel() {
        const initiative = this.initiative();
        if (!initiative || !this.selectedChannelId) return;

        this.#marketingService.assignInitiativeChannel(initiative.id, parseInt(this.selectedChannelId), this.isPrimaryChannel()).subscribe(() => {
            if (this.initiative()) {
                this.loadInitiative(initiative.id.toString());
            }
            this.resetChannelForm();
        });
    }

    resetChannelForm() {
        this.selectedChannelId = '';
        this.isPrimaryChannel.set(false);
        this.showChannelModal.set(false);
    }

    // Workflow Management
    attachWorkflow() {
        const initiative = this.initiative();
        if (!initiative || !this.selectedWorkflowId) return;

        this.#marketingService
            .attachWorkflowToInitiative(initiative.id, {
                marketing_workflow_id: this.selectedWorkflowId,
                is_active: true,
            })
            // TODO(types): endpoint returns the initiative's full workflow list, but the service
            // method is typed via `post(..., MarketingWorkflow)` (single item) since it deserializes
            // per-item either way; cast once here rather than changing the shared post() overloads.
            .subscribe((workflows) => {
                this.initiative.update((current) => {
                    if (!current) return current;
                    current.workflows = workflows as unknown as MarketingWorkflow[];
                    return Object.assign(Object.create(Object.getPrototypeOf(current)), current);
                });
                this.resetWorkflowForm();
            });
    }

    resetWorkflowForm() {
        this.selectedWorkflowId = '';
        this.showWorkflowModal.set(false);
    }

    // Metric Management
    attachMetric() {
        const initiative = this.initiative();
        if (!initiative || !this.selectedMetricId) return;

        this.#marketingService
            .attachMetricToInitiative(initiative.id, {
                metric_id: this.selectedMetricId,
                target_value: this.metricTargetValue,
            })
            .pipe(map(() => this.availableMetrics().find((m) => m.id === this.selectedMetricId)!))
            .subscribe((metric: MarketingPerformanceMetric) => {
                if (metric) {
                    metric.pivot = {
                        target_value: this.metricTargetValue,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    };
                    this.initiative.update((current) => {
                        if (!current) return current;
                        current.performance_metrics = [...(current.performance_metrics || []), metric];
                        return Object.assign(Object.create(Object.getPrototypeOf(current)), current);
                    });
                }
                this.resetMetricForm();
            });
    }

    resetMetricForm() {
        this.selectedMetricId = '';
        this.metricTargetValue = undefined;
        this.showMetricModal.set(false);
    }

}
