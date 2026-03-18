import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarketingService } from '@models/marketing/marketing.service';
import { MarketingPerformanceMetric } from '@models/marketing/marketing-performance-metrics.model';
import { MarketingActivity } from '@models/marketing/marketing-activity.model';
import { NexusModule } from 'src/app/nx/nexus.module';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { GuidedTourComponent } from '@shards/guided-tour/guided-tour.component';

// Expose MarketingActivity colors to template
const ActivityStatsColors = MarketingActivity.STATS_COLORS;

@Component({
    selector: 'marketing-metrics',
    templateUrl: './marketing-metrics.component.html',
    styleUrls: ['./marketing-metrics.component.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, NexusModule, NgbTooltipModule, EmptyStateComponent, GuidedTourComponent]
})
export class MarketingMetricsComponent implements OnInit {
    #marketingService = inject(MarketingService);

    metrics: MarketingPerformanceMetric[] = [];
    filteredMetrics: MarketingPerformanceMetric[] = [];
    selectedMetric: MarketingPerformanceMetric | null = null;

    // Expose colors to template
    readonly STATS_COLORS = ActivityStatsColors;

    // Filters
    searchTerm = '';
    typeFilter = '';
    
    // Metric form
    showMetricModal = false;
    editingMetric: MarketingPerformanceMetric | null = null;
    metricForm: Partial<MarketingPerformanceMetric> = {
        name: '',
        description: '',
        metric_type: 'counter',
        target_value: undefined
    };

    // Statistics
    stats = {
        total: 0,
        byType: {
            counter: 0,
            percentage: 0,
            conversion: 0,
            currency: 0,
            duration: 0
        }
    };

    metricTypes = [
        { value: 'counter', label: 'Counter', icon: 'tag', description: 'Simple count (e.g., emails sent)' },
        { value: 'percentage', label: 'Percentage', icon: 'percent', description: 'Value as percentage (e.g., open rate)' },
        { value: 'conversion', label: 'Conversion', icon: 'trending_up', description: 'Conversion rate (e.g., click-through rate)' },
        { value: 'currency', label: 'Currency', icon: 'attach_money', description: 'Monetary value (e.g., revenue)' },
        { value: 'duration', label: 'Duration', icon: 'schedule', description: 'Time duration (e.g., response time)' }
    ];

    ngOnInit() {
        this.loadMetrics();
    }

    loadMetrics() {
        this.#marketingService.indexMetrics()
            .subscribe((metrics: MarketingPerformanceMetric[]) => {
                this.metrics = metrics;
                this.applyFilters();
                this.calculateStats();
            });
    }

    applyFilters() {
        this.filteredMetrics = this.metrics.filter(metric => {
            const matchesType = !this.typeFilter || metric.metric_type === this.typeFilter;
            return matchesType;
        });
    }

    filterByType(type: string) {
        this.typeFilter = type;
        this.applyFilters();
    }

    calculateStats() {
        this.stats.total = this.metrics.length;
        this.stats.byType = {
            counter: this.metrics.filter(m => m.metric_type === 'counter').length,
            percentage: this.metrics.filter(m => m.metric_type === 'percentage').length,
            conversion: this.metrics.filter(m => m.metric_type === 'conversion').length,
            currency: this.metrics.filter(m => m.metric_type === 'currency').length,
            duration: this.metrics.filter(m => m.metric_type === 'duration').length
        };
    }

    selectMetric(metric: MarketingPerformanceMetric) {
        this.selectedMetric = metric;
    }

    openCreateModal() {
        this.editingMetric = null;
        this.metricForm = {
            name: '',
            description: '',
            metric_type: 'counter',
            target_value: undefined
        };
        this.showMetricModal = true;
    }

    openEditModal(metric: MarketingPerformanceMetric) {
        this.editingMetric = metric;
        this.metricForm = {
            name: metric.name,
            description: metric.description,
            metric_type: metric.metric_type,
            target_value: metric.target_value
        };
        this.showMetricModal = true;
    }

    saveMetric() {
        if (!this.metricForm.name || !this.metricForm.metric_type) return;

        const metricData = {
            name: this.metricForm.name,
            description: this.metricForm.description,
            metric_type: this.metricForm.metric_type,
            target_value: this.metricForm.target_value
        };

        if (this.editingMetric) {
            // Update existing metric
            this.#marketingService.updateMetric(this.editingMetric.id!, metricData)
                .subscribe((updated: MarketingPerformanceMetric) => {
                    const index = this.metrics.findIndex(m => m.id === updated.id);
                    if (index !== -1) {
                        this.metrics[index] = updated;
                    }
                    if (this.selectedMetric?.id === updated.id) {
                        this.selectedMetric = updated;
                    }
                    this.applyFilters();
                    this.calculateStats();
                    this.resetForm();
                });
        } else {
            // Create new metric
            this.#marketingService.storeMetric(metricData)
                .subscribe((metric: MarketingPerformanceMetric) => {
                    this.metrics.push(metric);
                    this.applyFilters();
                    this.calculateStats();
                    this.resetForm();
                });
        }
    }

    deleteMetric(metric: MarketingPerformanceMetric) {
        if (!confirm(`Delete metric "${metric.name}"? This will remove it from all initiatives and activities.`)) {
            return;
        }

        this.#marketingService.destroyMetric(metric.id!)
            .subscribe(() => {
                this.metrics = this.metrics.filter(m => m.id !== metric.id);
                if (this.selectedMetric?.id === metric.id) {
                    this.selectedMetric = null;
                }
                this.applyFilters();
                this.calculateStats();
            });
    }

    resetForm() {
        this.metricForm = {
            name: '',
            description: '',
            metric_type: 'counter',
            target_value: undefined
        };
        this.editingMetric = null;
        this.showMetricModal = false;
    }

    getMetricTypeInfo(type: string) {
        return this.metricTypes.find(t => t.value === type);
    }

    formatMetricValue(metric: MarketingPerformanceMetric): string {
        switch (metric.metric_type) {
            case 'percentage': {
                const percentage = (metric!.activity_stats!.completed / metric!.activity_stats!.total) * 100;
                return `${percentage.toFixed(1)}%`; 
            }
            case 'conversion':
                return `${(metric!.activity_stats!.completed / metric!.activity_stats!.total * 100).toFixed(1)}%`;
            case 'currency':
                return `$${metric!.activity_stats!.completed.toLocaleString()}`;
            case 'duration':
                return `${metric!.activity_stats!.completed}h`;
            default:
                return metric!.activity_stats!.completed.toString();
        }
    }

    formatTargetValue(metric: MarketingPerformanceMetric): string {
        const value = metric.target_value ?? 0;
        switch (metric.metric_type) {
            case 'percentage':
                return `${value}%`;
            case 'conversion':
                return `${value}%`;
            case 'currency':
                return `$${value.toLocaleString()}`;
            case 'duration':
                return `${value}h`;
            default:
                return value.toString();
        }
    }

    getCompletedTooltip(count: number): string {
        return $localize`:@@i18n.marketing.completed_count:completed: ${count}`;
    }

    getOverdueTooltip(count: number): string {
        return $localize`:@@i18n.marketing.overdue_count:overdue: ${count}`;
    }

    getPendingTooltip(count: number): string {
        return $localize`:@@i18n.marketing.pending_count:pending: ${count}`;
    }

    getSkippedTooltip(count: number): string {
        return $localize`:@@i18n.marketing.skipped_count:skipped: ${count}`;
    }
}
