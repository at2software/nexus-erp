import { Dictionary } from '@constants/constants';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { MarketingService } from '@models/marketing/marketing.service';
import { dayjs, Dayjs } from '@constants/dates';
import { NgxDaterangepickerMd } from 'ngx-daterangepicker-material';
import { FormsModule } from '@angular/forms';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { forkJoin } from 'rxjs';
import { SankeyChartComponent } from '@charts/sankey-chart/sankey-chart.component';
import { ChartProgressComponent } from '@charts/chart-progress/chart-progress.component';

import { GlobalService } from '@models/global.service';
import { LeadSourceService } from '@models/project/lead_source.service';
import { LeadSource } from '@models/project/lead_source.model';
import { InputModalService } from '@app/_modals/modal-input/modal-input.component';
import { SpinnerComponent } from '@shards/spinner/spinner.component';
import { MarketingDashboardStats, RemarketingResponse, SankeyData } from '@models/api-response';
import { MarketingPerformanceMetric } from '@models/marketing/marketing-performance-metrics.model';
import { File } from '@models/file/file.model';
import { storageGet, storageSet } from '@constants/storage';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'marketing-dashboard',
    templateUrl: './marketing-dashboard.component.html',
    styleUrls: ['./marketing-dashboard.component.scss'],
    imports: [NgxDaterangepickerMd, FormsModule, NgbTooltipModule, SankeyChartComponent, ChartProgressComponent, SpinnerComponent],
})
export class MarketingDashboardComponent {
    #destroyRef = inject(DestroyRef);

    funnelMode: 'count' | 'money' = 'count';
    funnelData = signal<SankeyData | undefined>(undefined);
    loadingFunnel = signal(false);
    creation_span?: { startDate: Dayjs; endDate: Dayjs };

    presetRanges = {
        'Last 12 Months': [dayjs().subtract(12, 'months').startOf('month'), dayjs().endOf('month')],
        'Last 36 Months': [dayjs().subtract(36, 'months').startOf('month'), dayjs().endOf('month')],
        'Last Year': [dayjs().subtract(1, 'year').startOf('year'), dayjs().subtract(1, 'year').endOf('year')],
        'This Year': [dayjs().startOf('year'), dayjs().endOf('year')],
        'Last 3 Years': [dayjs().subtract(3, 'years').startOf('year'), dayjs().endOf('year')],
        'Last 5 Years': [dayjs().subtract(5, 'years').startOf('year'), dayjs().endOf('year')],
    } satisfies Record<string, [Dayjs, Dayjs]>;
    service = inject(MarketingService);
    router = inject(Router);
    #global = inject(GlobalService);
    #leadSourceSvc = inject(LeadSourceService);
    #input = inject(InputModalService);

    // Assets properties
    assetCategories: { name: string; icon: string; color: string; count: number }[] = [];
    loadingAssets = signal(false);

    // Overview stats
    stats = signal({
        initiatives: { total: 0, active: 0 },
        prospects: { total: 0, new: 0, engaged: 0, converted: 0, unresponsive: 0, disqualified: 0, on_hold: 0 },
        activities: { pending: 0, overdue: 0 },
    });

    // Extended dashboard data
    dashboardStats = signal<MarketingDashboardStats | null>(null);
    loadingDashboard = signal(true);
    remarketing = signal<RemarketingResponse | null>(null);
    loadingRemarketing = signal(true);
    kpiMetrics: MarketingPerformanceMetric[] = [];
    loadingMetrics = signal(true);
    activitySchedule = signal<{ day: string; date: string; total: number; completed: number; pending: number; isToday: boolean }[]>([]);

    constructor() {
        this.reload();
        this.loadAssetStats();
        this.loadOverviewStats();
        this.loadDashboardStats();
        this.loadRemarketing();
        this.loadKpiMetrics();
    }

    toggleFunnelMode() {
        this.funnelMode = this.funnelMode === 'count' ? 'money' : 'count';
    }
    reload() {
        this.reloadFunnel();
    }
    getFilters() {
        const filters: Dictionary = {};
        if (this.creation_span?.startDate && this.creation_span?.endDate) {
            filters.created_after = this.creation_span.startDate.format('DD.MM.YYYY');
            filters.created_before = this.creation_span.endDate.add(1, 'day').format('DD.MM.YYYY');
        }
        return filters;
    }
    reloadFunnel() {
        this.funnelData.set(undefined);
        this.loadingFunnel.set(true);
        this.service.getFunnel(this.getFilters()).subscribe({
            next: (response) => {
                this.funnelData.set(response);
                this.loadingFunnel.set(false);
            },
            error: () => this.loadingFunnel.set(false),
        });
    }
    clearSelection = () => (this.creation_span = undefined);
    onCreationUpdated = () => this.reload();

    loadOverviewStats() {
        forkJoin({
            initiatives: this.service.indexInitiatives(),
            prospects: this.service.showProspectStats(),
        })
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe({
                next: (response) => {
                    const initiatives = response.initiatives.data;
                    const p = response.prospects;
                    this.stats.set({
                        initiatives: {
                            total: initiatives.length,
                            active: initiatives.filter((i) => i.status === 'active').length,
                        },
                        prospects: {
                            total: p.total || 0,
                            new: p.by_status?.new || 0,
                            engaged: p.by_status?.engaged || 0,
                            converted: p.by_status?.converted || 0,
                            unresponsive: p.by_status?.unresponsive || 0,
                            disqualified: p.by_status?.disqualified || 0,
                            on_hold: p.by_status?.on_hold || 0,
                        },
                        activities: {
                            pending: p.activities_pending || 0,
                            overdue: p.activities_overdue || 0,
                        },
                    });
                },
                error: (err) => console.error('Error loading overview stats:', err),
            });
    }

    loadDashboardStats() {
        this.loadingDashboard.set(true);
        this.service
            .getDashboardStats()
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe({
                next: (data) => {
                    this.dashboardStats.set(data);
                    this.buildActivitySchedule();
                    this.loadingDashboard.set(false);
                },
                error: () => {
                    this.loadingDashboard.set(false);
                },
            });
    }

    loadRemarketing() {
        this.loadingRemarketing.set(true);
        this.service
            .getRemarketing()
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe({
                next: (data) => {
                    this.remarketing.set(data);
                    this.loadingRemarketing.set(false);
                },
                error: () => {
                    this.loadingRemarketing.set(false);
                },
            });
    }

    loadKpiMetrics() {
        this.loadingMetrics.set(true);
        this.service
            .indexMetrics()
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe({
                next: (data) => {
                    this.kpiMetrics = data;
                    this.loadingMetrics.set(false);
                },
                error: () => {
                    this.loadingMetrics.set(false);
                },
            });
    }

    buildActivitySchedule() {
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const schedule = [];
        for (let i = 0; i <= 6; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            const entry = (this.dashboardStats()?.heatmap || []).find((h) => h.date === dateStr);
            schedule.push({
                day: i === 0 ? 'Today' : dayNames[d.getDay()],
                date: dateStr,
                total: entry?.total || 0,
                completed: entry?.completed || 0,
                pending: entry?.pending || 0,
                isToday: i === 0,
            });
        }
        this.activitySchedule.set(schedule);
    }

    agingBars = computed(() => {
        const aging = this.dashboardStats()?.aging;
        if (!aging) return [];
        const { fresh = 0, warm = 0, cooling = 0, stale = 0 } = aging;
        const max = Math.max(fresh, warm, cooling, stale) || 1;
        return [
            { label: 'fresh', value: fresh, h: Math.round((fresh / max) * 52) },
            { label: 'warm', value: warm, h: Math.round((warm / max) * 52) },
            { label: 'cooling', value: cooling, h: Math.round((cooling / max) * 52) },
            { label: 'stale', value: stale, h: Math.round((stale / max) * 52) },
        ];
    });

    conversionRate = computed<number>(() => {
        const total = this.stats().prospects.total;
        if (!total) return 0;
        return Math.round((this.stats().prospects.converted / total) * 100);
    });

    onNewLeadSource() {
        this.#input.open('Please enter the name of the new source').then((response) => {
            if (response) {
                this.#leadSourceSvc.store(response.text).subscribe((_) => this.#global.lead_sources.update((sources) => [...sources, LeadSource.fromJson(_)]));
            }
        });
    }

    navigateToSection(route: string) {
        this.router.navigate(['/marketing', route]);
    }
    navigateToInitiative(id: number) {
        this.router.navigate(['/marketing/initiatives', id]);
    }
    navigateToWorkflow(id: number) {
        this.router.navigate(['/marketing/workflows', id]);
    }
    navigateToRemarketing() {
        this.router.navigate(['/marketing/remarketing']);
    }
    navigateToMemberProspects(userId: number) {
        const existing = storageGet<Dictionary<unknown>>('marketing-prospects-filters', {});
        storageSet('marketing-prospects-filters', { ...existing, userFilter: String(userId) });
        this.router.navigate(['/marketing/prospects']);
    }

    loadAssetStats() {
        this.loadingAssets.set(true);
        this.service.indexMarketingAssets('', '', '').subscribe(
            (assets) => {
                const defaultCategories = [
                    { name: 'Brand Assets', icon: 'branding_watermark', color: 'primary' },
                    { name: 'Social Media', icon: 'share', color: 'info' },
                    { name: 'Email Templates', icon: 'email', color: 'success' },
                    { name: 'Presentations', icon: 'slideshow', color: 'warning' },
                    { name: 'Print Materials', icon: 'print', color: 'secondary' },
                    { name: 'Video Content', icon: 'videocam', color: 'danger' },
                    { name: 'Documents', icon: 'description', color: 'dark' },
                ];
                const categoryCounts: Dictionary<number> = {};
                assets.forEach((asset: File) => {
                    if (asset.category) categoryCounts[asset.category] = (categoryCounts[asset.category] || 0) + 1;
                });
                this.assetCategories = defaultCategories.map((c) => ({ ...c, count: categoryCounts[c.name] || 0 })).filter((c) => c.count > 0);
                this.loadingAssets.set(false);
            },
            () => {
                this.loadingAssets.set(false);
            },
        );
    }

    navigateToAssets(categoryName: string) {
        this.router.navigate(['/marketing/assets', encodeURIComponent(categoryName)]);
    }
}
