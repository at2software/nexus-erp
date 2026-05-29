import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { IActivityBase } from '@models/marketing/activity-base.interface';
import { MarketingPerformanceMetric } from '@models/marketing/marketing-performance-metrics.model';

@Component({
    selector: 'activity-table',
    standalone: true,
    imports: [NgbTooltipModule, RouterLink, RouterLinkActive],
    templateUrl: './activity-table.component.html',
    styleUrl: './activity-table.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityTableComponent {
    activities = input<IActivityBase[]>([]);
    prospectsCount = input(0);
    activityRoute = input<any[] | null>(null);
    activityClicked = output<IActivityBase>();
    progressBar = input(true);

    readonly STATS_COLORS = { completed: 'bg-success', overdue: 'bg-danger', skipped: 'bg-purple', pending: 'bg-dark-grey' };

    hoveredActivityId: string | null = null;

    sortedActivities = computed(() => [...this.activities()].sort((a, b) => (a.day_offset || 0) - (b.day_offset || 0)));

    #activityMap = computed(() => new Map(this.activities().map((a) => [a.id, a])));

    getParentActivityName(parentId: string): string {
        const parent = this.#activityMap().get(parentId);
        return parent ? `Day ${parent.day_offset}: ${parent.name}` : '';
    }

    getParentActivityDay(parentId: string): number | string {
        const parent = this.#activityMap().get(parentId);
        return parent ? parent.day_offset : '';
    }

    getMetricsTooltip(metrics?: MarketingPerformanceMetric[]): string {
        if (!metrics || metrics.length === 0) return '';
        return metrics.map((m) => m.name).join(', ');
    }

    formatQuickAction(action: string): string {
        const labels: Record<string, string> = {
            EMAIL: 'Email',
            LINKEDIN: 'LinkedIn',
            LINKEDIN_SEARCH: 'LinkedIn Search',
            CALL: 'Phone Call',
        };
        return labels[action] || action.replace(/_/g, ' ');
    }

    getQuickActionIcon(action: string): string {
        const icons: Record<string, string> = {
            EMAIL: 'email',
            LINKEDIN: 'open_in_new',
            LINKEDIN_SEARCH: 'search',
            CALL: 'phone',
        };
        return icons[action] || '';
    }

    onActivityClick(activity: IActivityBase) {
        this.activityClicked.emit(activity);
    }

    hasPerformanceMetrics(activity: IActivityBase): boolean {
        return 'performance_metrics' in activity && Array.isArray(activity.performance_metrics) && activity.performance_metrics.length > 0;
    }

    getFirstMetric(activity: IActivityBase): MarketingPerformanceMetric | null {
        if (!this.hasPerformanceMetrics(activity)) return null;
        return activity.performance_metrics![0];
    }

    getPerformanceMetrics(activity: IActivityBase): MarketingPerformanceMetric[] {
        if (!this.hasPerformanceMetrics(activity)) return [];
        return activity.performance_metrics || [];
    }
}
