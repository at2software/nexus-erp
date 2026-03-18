import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MarketingService } from '@models/marketing/marketing.service';
import moment from 'moment';
import { NgxDaterangepickerMd } from 'ngx-daterangepicker-material';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { SettingsProjectsLeadsComponent } from '@app/settings/settings-projects/settings-projects-leads/settings-projects-leads.component';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { SankeyChartComponent, SankeyData } from '@charts/sankey-chart/sankey-chart.component';

@Component({
    selector: 'marketing-dashboard',
    templateUrl: './marketing-dashboard.component.html',
    styleUrls: ['./marketing-dashboard.component.scss'],
    standalone: true,
    imports: [CommonModule, NgxDaterangepickerMd, FormsModule, NgbTooltipModule, SettingsProjectsLeadsComponent, SankeyChartComponent, EmptyStateComponent]
})
export class MarketingDashboardComponent implements OnDestroy, OnInit {

    #destroy$ = new Subject<void>();

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
    service = inject(MarketingService)
    router = inject(Router)

    // Assets properties
    assetCategories: any[] = []
    loadingAssets = false

    // Overview stats
    stats = {
        initiatives: {
            total: 0,
            active: 0
        },
        prospects: {
            total: 0,
            new: 0,
            engaged: 0,
            converted: 0
        },
        activities: {
            pending: 0,
            overdue: 0
        }
    };

    ngOnInit() {
        this.reload()
        this.loadAssetStats()
        this.loadOverviewStats()
    }

    ngOnDestroy() {
        this.#destroy$.next();
        this.#destroy$.complete();
    }

    toggleFunnelMode() {
        this.funnelMode = this.funnelMode === 'count' ? 'money' : 'count';
    }
    reload() {
        this.reloadFunnel()
    }
    getFilters() {
        const filters:any = {}
        if (this.creation_span && this.creation_span.startDate && this.creation_span.endDate) {
            filters.created_after = this.creation_span.startDate.format('DD.MM.YYYY')
            filters.created_before = this.creation_span.endDate.add(1, 'day').format('DD.MM.YYYY')
        }
        return filters
    }
    reloadFunnel() {
        this.service.getFunnel(this.getFilters()).subscribe((response: any) => {
            this.funnelData = response;
        });
    }

    clearSelection = () => this.creation_span = undefined

    onCreationUpdated = () => this.reload()

    loadOverviewStats() {
        forkJoin({
            initiatives: this.service.indexInitiatives(),
            prospects: this.service.showProspectStats()
        }).pipe(takeUntil(this.#destroy$))
        .subscribe({
            next: (response: any) => {
                const initiatives = response.initiatives.data || response.initiatives;
                this.stats.initiatives = {
                    total: initiatives.length,
                    active: initiatives.filter((i: any) => i.status === 'active').length
                };

                const prospects = response.prospects;
                this.stats.prospects = {
                    total: prospects.total || 0,
                    new: prospects.by_status?.new || 0,
                    engaged: prospects.by_status?.engaged || 0,
                    converted: prospects.by_status?.converted || 0
                };

                this.stats.activities = {
                    pending: prospects.activities_pending || 0,
                    overdue: prospects.activities_overdue || 0
                };
            },
            error: (error) => {
                console.error('Error loading overview stats:', error);
            }
        });
    }

    navigateToSection(route: string) {
        this.router.navigate(['/marketing', route]);
    }

    loadAssetStats() {
        this.loadingAssets = true
        // Use the existing endpoint to get all assets and calculate counts
        this.service.indexMarketingAssets('', '', '').subscribe((assets: any) => {
            // Default categories with icons and colors
            const defaultCategories = [
                { name: 'Brand Assets', icon: 'branding_watermark', color: 'primary' },
                { name: 'Social Media', icon: 'share', color: 'info' },
                { name: 'Email Templates', icon: 'email', color: 'success' },
                { name: 'Presentations', icon: 'slideshow', color: 'warning' },
                { name: 'Print Materials', icon: 'print', color: 'secondary' },
                { name: 'Video Content', icon: 'videocam', color: 'danger' },
                { name: 'Documents', icon: 'description', color: 'dark' }
            ]

            // Calculate counts by category
            const categoryCounts: Record<string, number> = {}
            assets.forEach((asset: any) => {
                if (asset.category) {
                    categoryCounts[asset.category] = (categoryCounts[asset.category] || 0) + 1
                }
            })

            // Map to categories with counts
            this.assetCategories = defaultCategories.map(category => ({
                ...category,
                count: categoryCounts[category.name] || 0
            })).filter(category => category.count > 0) // Only show categories with assets

            this.loadingAssets = false
        }, error => {
            console.error('Error loading assets:', error)
            this.loadingAssets = false
        })
    }

    navigateToAssets(categoryName: string) {
        const encodedCategory = encodeURIComponent(categoryName)
        this.router.navigate(['/marketing/assets', encodedCategory])
    }
}
