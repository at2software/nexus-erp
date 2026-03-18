import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { IActivityBase } from '@models/marketing/activity-base.interface';
import { MarketingPerformanceMetric } from '@models/marketing/marketing-performance-metrics.model';

@Component({
    selector: 'activity-table',
    standalone: true,
    imports: [CommonModule, NgbTooltipModule],
    templateUrl: './activity-table.component.html',
    styleUrl: './activity-table.component.scss'
})
export class ActivityTableComponent {
    @Input() activities: IActivityBase[] = [];
    @Output() activityClicked = new EventEmitter<IActivityBase>();

    hoveredActivityId: string | null = null;

    getSortedActivities(): IActivityBase[] {
        if (!this.activities) return [];
        return [...this.activities].sort((a, b) => (a.day_offset || 0) - (b.day_offset || 0));
    }

    getParentActivityName(parentId: string): string {
        if (!this.activities) return '';
        const parent = this.activities.find(a => a.id === parentId);
        return parent ? `Day ${parent.day_offset}: ${parent.name}` : '';
    }

    getParentActivityDay(parentId: string): number | string {
        if (!this.activities) return '';
        const parent = this.activities.find(a => a.id === parentId);
        return parent ? parent.day_offset : '';
    }

    getMetricsTooltip(metrics?: MarketingPerformanceMetric[]): string {
        if (!metrics || metrics.length === 0) return '';
        return metrics.map(m => m.name).join(', ');
    }

    formatQuickAction(action: string): string {
        const labels: Record<string, string> = {
            'EMAIL': 'Email',
            'LINKEDIN': 'LinkedIn',
            'LINKEDIN_SEARCH': 'LinkedIn Search',
            'CALL': 'Phone Call'
        };
        return labels[action] || action.replace(/_/g, ' ');
    }

    getQuickActionIcon(action: string): string {
        const icons: Record<string, string> = {
            'EMAIL': 'email',
            'LINKEDIN': 'open_in_new',
            'LINKEDIN_SEARCH': 'search',
            'CALL': 'phone'
        };
        return icons[action] || '';
    }

    onActivityClick(activity: IActivityBase) {
        this.activityClicked.emit(activity);
    }

    hasPerformanceMetrics(activity: IActivityBase): boolean {
        return 'performance_metrics' in activity && 
               Array.isArray(activity.performance_metrics) && 
               activity.performance_metrics.length > 0;
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
