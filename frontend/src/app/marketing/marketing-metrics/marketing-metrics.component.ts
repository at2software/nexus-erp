import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MarketingService } from '@models/marketing/marketing.service';
import { MarketingPerformanceMetric } from '@models/marketing/marketing-performance-metrics.model';
import { MarketingActivity } from '@models/marketing/marketing-activity.model';
import { Nx, ActionEmitterType } from '@app/nx/nx.directive';
import { NxActionType } from '@app/nx/nx.actions';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { GuidedTourComponent } from '@shards/guided-tour/guided-tour.component';
import { ColorPickerDirective } from 'ngx-color-picker';

const ActivityStatsColors = MarketingActivity.STATS_COLORS;

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'marketing-metrics',
    templateUrl: './marketing-metrics.component.html',
    styleUrls: ['./marketing-metrics.component.scss'],
    standalone: true,
    imports: [FormsModule, Nx, NgbTooltipModule, EmptyStateComponent, GuidedTourComponent, ColorPickerDirective],
})
export class MarketingMetricsComponent implements OnInit {
    #marketingService = inject(MarketingService);
    #cdr = inject(ChangeDetectorRef);

    metrics: MarketingPerformanceMetric[] = [];
    filteredMetrics: MarketingPerformanceMetric[] = [];
    selectedMetric: MarketingPerformanceMetric | null = null;

    readonly STATS_COLORS = ActivityStatsColors;

    searchTerm = '';
    typeFilter = '';

    showMetricModal = signal(false);
    editingMetric: MarketingPerformanceMetric | null = null;
    metricForm = {
        name: '',
        description: undefined as string | undefined,
        metric_type: 'counter' as MarketingPerformanceMetric['metric_type'],
        target_value: undefined as number | undefined,
        kpi_icon: '',
        kpi_color: '',
    };

    iconSearch = '';

    readonly editNxContext = { openEdit: (m: MarketingPerformanceMetric) => this.openEditModal(m) };

    stats = {
        total: 0,
        byType: { counter: 0, percentage: 0, conversion: 0, currency: 0, duration: 0 },
    };

    metricTypes = [
        { value: 'counter', label: $localize`:@@i18n.marketing.counter:Counter`, icon: 'tag', description: $localize`:@@i18n.marketing.counterDesc:Simple count (e.g., emails sent)` },
        { value: 'percentage', label: $localize`:@@i18n.marketing.percentage:Percentage`, icon: 'percent', description: $localize`:@@i18n.marketing.percentageDesc:Value as percentage (e.g., open rate)` },
        { value: 'conversion', label: $localize`:@@i18n.marketing.conversion:Conversion`, icon: 'trending_up', description: $localize`:@@i18n.marketing.conversionDesc:Conversion rate (e.g., click-through rate)` },
        { value: 'currency', label: $localize`:@@i18n.marketing.currency:Currency`, icon: 'attach_money', description: $localize`:@@i18n.marketing.currencyDesc:Monetary value (e.g., revenue)` },
        { value: 'duration', label: $localize`:@@i18n.marketing.duration:Duration`, icon: 'schedule', description: $localize`:@@i18n.marketing.durationDesc:Time duration (e.g., response time)` },
    ];

    readonly MATERIAL_ICONS = [
        // Analytics
        'analytics', 'bar_chart', 'pie_chart', 'show_chart', 'trending_up', 'trending_down', 'leaderboard', 'insights', 'query_stats', 'monitoring',
        // Marketing
        'campaign', 'ads_click', 'local_offer', 'sell', 'storefront', 'shopping_cart', 'loyalty', 'redeem', 'volunteer_activism', 'workspace_premium',
        // Communication
        'email', 'phone', 'message', 'chat', 'forum', 'send', 'notifications', 'inbox', 'mark_email_read', 'contact_mail',
        // Money
        'attach_money', 'payments', 'account_balance', 'savings', 'euro', 'currency_exchange', 'price_check', 'credit_card', 'receipt', 'request_quote',
        // Time
        'schedule', 'timer', 'alarm', 'access_time', 'hourglass_empty', 'calendar_today', 'event', 'date_range', 'update', 'history',
        // People
        'person', 'group', 'people', 'person_add', 'supervisor_account', 'groups', 'account_circle', 'badge', 'handshake', 'record_voice_over',
        // Goals
        'flag', 'emoji_events', 'star', 'grade', 'verified', 'check_circle', 'task_alt', 'done_all', 'military_tech', 'celebration',
        // Content
        'article', 'description', 'note', 'assignment', 'list', 'checklist', 'text_snippet', 'edit_note', 'bookmark', 'push_pin',
        // Metrics
        'tag', 'percent', 'numbers', 'functions', 'calculate', 'speed', 'bolt', 'flash_on', 'moving', 'stacked_line_chart',
        // Misc
        'favorite', 'thumb_up', 'visibility', 'share', 'link', 'search', 'tune', 'settings', 'build', 'category',
        'label', 'location_on', 'public', 'language', 'translate', 'cloud', 'rocket_launch', 'auto_awesome', 'hub', 'network_check',
    ];

    get filteredIcons(): string[] {
        return this.iconSearch
            ? this.MATERIAL_ICONS.filter((i) => i.includes(this.iconSearch.toLowerCase()))
            : this.MATERIAL_ICONS;
    }

    ngOnInit() {
        this.loadMetrics();
    }

    loadMetrics() {
        this.#marketingService.indexMetrics().subscribe((metrics: MarketingPerformanceMetric[]) => {
            this.metrics = metrics;
            this.applyFilters();
            this.calculateStats();
            this.#cdr.markForCheck();
        });
    }

    applyFilters() {
        this.filteredMetrics = this.metrics.filter((metric) => !this.typeFilter || metric.metric_type === this.typeFilter);
    }

    filterByType(type: string) {
        this.typeFilter = type;
        this.applyFilters();
    }

    calculateStats() {
        this.stats.total = this.metrics.length;
        this.stats.byType = {
            counter: this.metrics.filter((m) => m.metric_type === 'counter').length,
            percentage: this.metrics.filter((m) => m.metric_type === 'percentage').length,
            conversion: this.metrics.filter((m) => m.metric_type === 'conversion').length,
            currency: this.metrics.filter((m) => m.metric_type === 'currency').length,
            duration: this.metrics.filter((m) => m.metric_type === 'duration').length,
        };
    }

    selectMetric(metric: MarketingPerformanceMetric) {
        this.selectedMetric = metric;
    }

    openCreateModal() {
        this.editingMetric = null;
        this.metricForm = { name: '', description: undefined, metric_type: 'counter', target_value: undefined, kpi_icon: '', kpi_color: '' };
        this.iconSearch = '';
        this.showMetricModal.set(true);
    }

    openEditModal(metric: MarketingPerformanceMetric) {
        this.editingMetric = metric;
        this.metricForm = {
            name: metric.name,
            description: metric.description,
            metric_type: metric.metric_type,
            target_value: metric.target_value,
            kpi_icon: metric.kpi_icon ?? '',
            kpi_color: metric.kpi_color ?? '',
        };
        this.iconSearch = '';
        this.showMetricModal.set(true);
        this.#cdr.markForCheck();
    }

    saveMetric() {
        if (!this.metricForm.name || !this.metricForm.metric_type) return;

        const metricData = {
            name: this.metricForm.name,
            description: this.metricForm.description,
            metric_type: this.metricForm.metric_type,
            target_value: this.metricForm.target_value,
            kpi_icon: this.metricForm.kpi_icon || null,
            kpi_color: this.metricForm.kpi_color || null,
        };

        if (this.editingMetric) {
            this.#marketingService.updateMetric(this.editingMetric.id!, metricData).subscribe((updated: MarketingPerformanceMetric) => {
                const index = this.metrics.findIndex((m) => m.id === updated.id);
                if (index !== -1) this.metrics[index] = updated;
                if (this.selectedMetric?.id === updated.id) this.selectedMetric = updated;
                this.applyFilters();
                this.calculateStats();
                this.resetForm();
                this.#cdr.markForCheck();
            });
        } else {
            this.#marketingService.storeMetric(metricData).subscribe((metric: MarketingPerformanceMetric) => {
                this.metrics.push(metric);
                this.applyFilters();
                this.calculateStats();
                this.resetForm();
                this.#cdr.markForCheck();
            });
        }
    }

    deleteMetric(metric: MarketingPerformanceMetric) {
        if (!confirm(`Delete metric "${metric.name}"? This will remove it from all initiatives and activities.`)) return;

        this.#marketingService.destroyMetric(metric.id!).subscribe(() => {
            this.metrics = this.metrics.filter((m) => m.id !== metric.id);
            if (this.selectedMetric?.id === metric.id) this.selectedMetric = null;
            this.applyFilters();
            this.calculateStats();
            this.#cdr.markForCheck();
        });
    }

    onActionResolved(event: ActionEmitterType) {
        const actionType = typeof event.action.type === 'function' ? event.action.type() : event.action.type;
        if (actionType === NxActionType.Destructive) {
            const deleted = event.object.nx() as MarketingPerformanceMetric;
            this.metrics = this.metrics.filter((m) => m.id !== deleted.id);
            this.calculateStats();
        }
        this.#cdr.markForCheck();
    }

    resetForm() {
        this.metricForm = { name: '', description: undefined, metric_type: 'counter', target_value: undefined, kpi_icon: '', kpi_color: '' };
        this.iconSearch = '';
        this.editingMetric = null;
        this.showMetricModal.set(false);
    }

    getMetricTypeInfo(type: string) {
        return this.metricTypes.find((t) => t.value === type);
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
