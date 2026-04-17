import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { MarketingService } from '@models/marketing/marketing.service';
import moment from 'moment';
import { NgxDaterangepickerMd } from 'ngx-daterangepicker-material';
import { FormsModule } from '@angular/forms';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { forkJoin } from 'rxjs';
import { SankeyChartComponent, SankeyData } from '@charts/sankey-chart/sankey-chart.component';
import { ChartProgressComponent } from '@charts/chart-progress/chart-progress.component';
import { CommonModule } from '@angular/common';
import { GlobalService } from '@models/global.service';
import { LeadSourceService } from '@models/project/lead_source.service';
import { LeadSource } from '@models/project/lead_source.model';
import { InputModalService } from '@app/_modals/modal-input/modal-input.component';

@Component({
    selector: 'marketing-dashboard',
    templateUrl: './marketing-dashboard.component.html',
    styleUrls: ['./marketing-dashboard.component.scss'],
    standalone: true,
    imports: [NgxDaterangepickerMd, FormsModule, NgbTooltipModule, SankeyChartComponent, ChartProgressComponent, CommonModule]
})
export class MarketingDashboardComponent implements OnInit {

    #destroyRef = inject(DestroyRef);

    funnelMode: 'count' | 'money' = 'count';
    funnelData?: SankeyData;
    creation_span?: { startDate: any, endDate: any }

    presetRanges: any = {
        'Last 12 Months': [moment().subtract(12, 'months').startOf('month'), moment().endOf('month')],
        'Last 36 Months': [moment().subtract(36, 'months').startOf('month'), moment().endOf('month')],
        'Last Year'     : [moment().subtract(1, 'year').startOf('year'), moment().subtract(1, 'year').endOf('year')],
        'This Year'     : [moment().startOf('year'), moment().endOf('year')],
        'Last 3 Years'  : [moment().subtract(3, 'years').startOf('year'), moment().endOf('year')],
        'Last 5 Years'  : [moment().subtract(5, 'years').startOf('year'), moment().endOf('year')]
    }
    service          = inject(MarketingService)
    router           = inject(Router)
    #global          = inject(GlobalService)
    #leadSourceSvc   = inject(LeadSourceService)
    #input           = inject(InputModalService)

    // Assets properties
    assetCategories: any[] = []
    loadingAssets = false

    // Overview stats
    stats = {
        initiatives: { total: 0, active: 0 },
        prospects: { total: 0, new: 0, engaged: 0, converted: 0, unresponsive: 0, disqualified: 0, on_hold: 0 },
        activities: { pending: 0, overdue: 0 }
    };

    // Extended dashboard data
    dashboardStats: any = null;
    loadingDashboard = true;
    remarketing: any = null;
    loadingRemarketing = true;
    kpiMetrics: any[] = [];
    loadingMetrics = true;
    activitySchedule: any[] = [];

    ngOnInit() {
        this.reload()
        this.loadAssetStats()
        this.loadOverviewStats()
        this.loadDashboardStats()
        this.loadRemarketing()
        this.loadKpiMetrics()
    }

    toggleFunnelMode() {
        this.funnelMode = this.funnelMode === 'count' ? 'money' : 'count';
    }
    reload() { this.reloadFunnel() }
    getFilters() {
        const filters: any = {}
        if (this.creation_span?.startDate && this.creation_span?.endDate) {
            filters.created_after  = this.creation_span.startDate.format('DD.MM.YYYY')
            filters.created_before = this.creation_span.endDate.add(1, 'day').format('DD.MM.YYYY')
        }
        return filters
    }
    reloadFunnel() {
        this.service.getFunnel(this.getFilters()).subscribe((response: any) => {
            this.funnelData = response;
        });
    }
    clearSelection   = () => this.creation_span = undefined
    onCreationUpdated = () => this.reload()

    loadOverviewStats() {
        forkJoin({
            initiatives: this.service.indexInitiatives(),
            prospects:   this.service.showProspectStats()
        }).pipe(takeUntilDestroyed(this.#destroyRef))
        .subscribe({
            next: (response: any) => {
                const initiatives = response.initiatives.data || response.initiatives;
                this.stats.initiatives = {
                    total:  initiatives.length,
                    active: initiatives.filter((i: any) => i.status === 'active').length
                };
                const p = response.prospects;
                this.stats.prospects = {
                    total:        p.total || 0,
                    new:          p.by_status?.new || 0,
                    engaged:      p.by_status?.engaged || 0,
                    converted:    p.by_status?.converted || 0,
                    unresponsive: p.by_status?.unresponsive || 0,
                    disqualified: p.by_status?.disqualified || 0,
                    on_hold:      p.by_status?.on_hold || 0
                };
                this.stats.activities = {
                    pending: p.activities_pending || 0,
                    overdue: p.activities_overdue || 0
                };
            },
            error: (err) => console.error('Error loading overview stats:', err)
        });
    }

    loadDashboardStats() {
        this.loadingDashboard = true;
        this.service.getDashboardStats().pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe({
                next: (data: any) => {
                    this.dashboardStats = data;
                    this.buildActivitySchedule();
                    this.loadingDashboard = false;
                },
                error: () => { this.loadingDashboard = false; }
            });
    }

    loadRemarketing() {
        this.loadingRemarketing = true;
        this.service.getRemarketing().pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe({
                next:  (data: any) => { this.remarketing = data; this.loadingRemarketing = false; },
                error: () => { this.loadingRemarketing = false; }
            });
    }

    loadKpiMetrics() {
        this.loadingMetrics = true;
        this.service.indexMetrics().pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe({
                next:  (data: any) => { this.kpiMetrics = data; this.loadingMetrics = false; },
                error: () => { this.loadingMetrics = false; }
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
            const entry = (this.dashboardStats?.heatmap || []).find((h: any) => h.date === dateStr);
            schedule.push({
                day:       i === 0 ? 'Today' : dayNames[d.getDay()],
                date:      dateStr,
                total:     entry?.total || 0,
                completed: entry?.completed || 0,
                pending:   entry?.pending || 0,
                isToday:   i === 0
            });
        }
        this.activitySchedule = schedule;
    }

    get conversionRate(): number {
        const total = this.stats.prospects.total;
        if (!total) return 0;
        return Math.round((this.stats.prospects.converted / total) * 100);
    }

    onNewLeadSource() {
        this.#input.open('Please enter the name of the new source').then(response => {
            if (response) {
                this.#leadSourceSvc.store(response.text).subscribe(_ => this.#global.lead_sources.push(LeadSource.fromJson(_)))
            }
        })
    }

    navigateToSection(route: string)      { this.router.navigate(['/marketing', route]); }
    navigateToInitiative(id: number)      { this.router.navigate(['/marketing/initiatives', id]); }
    navigateToWorkflow(id: number)        { this.router.navigate(['/marketing/workflows', id]); }
    navigateToRemarketing()               { this.router.navigate(['/marketing/remarketing']); }

    loadAssetStats() {
        this.loadingAssets = true
        this.service.indexMarketingAssets('', '', '').subscribe((assets: any) => {
            const defaultCategories = [
                { name: 'Brand Assets',    icon: 'branding_watermark', color: 'primary' },
                { name: 'Social Media',    icon: 'share',              color: 'info' },
                { name: 'Email Templates', icon: 'email',              color: 'success' },
                { name: 'Presentations',   icon: 'slideshow',          color: 'warning' },
                { name: 'Print Materials', icon: 'print',              color: 'secondary' },
                { name: 'Video Content',   icon: 'videocam',           color: 'danger' },
                { name: 'Documents',       icon: 'description',        color: 'dark' }
            ]
            const categoryCounts: Record<string, number> = {}
            assets.forEach((asset: any) => {
                if (asset.category) categoryCounts[asset.category] = (categoryCounts[asset.category] || 0) + 1
            })
            this.assetCategories = defaultCategories
                .map(c => ({ ...c, count: categoryCounts[c.name] || 0 }))
                .filter(c => c.count > 0)
            this.loadingAssets = false
        }, () => { this.loadingAssets = false })
    }

    navigateToAssets(categoryName: string) {
        this.router.navigate(['/marketing/assets', encodeURIComponent(categoryName)])
    }
}
