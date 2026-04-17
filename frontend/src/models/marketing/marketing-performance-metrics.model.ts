import { Serializable } from '../serializable';
import { MarketingService } from './marketing.service';
import { NxActionType } from 'src/app/nx/nx.actions';
import { TActivityStats } from './marketing-activity.model';

export type TPivot<K1 extends string, K2 extends string> = {
    created_at?: string;
    updated_at?: string;
} & Partial<Record<`${K1}_id` | `${K2}_id`, string>>;

export class MarketingPerformanceMetric extends Serializable {
    static API_PATH = (): string => 'marketing_performance_metrics';
    SERVICE = MarketingService;

    name!: string;
    description?: string;
    metric_type!: 'counter' | 'percentage' | 'conversion' | 'currency' | 'duration';
    target_value?: number;
    current_value?: number;
    progress_percentage?: number;
    activity_stats?: TActivityStats;
    pivot?: TPivot<'marketing_initiative', 'marketing_performance_metric'> & { target_value?: number; };

    actions = [
        {
            title: $localize`:@@i18n.marketing.unlink_from_initiative:unlink from initiative`,
            group: true,
            type: NxActionType.Destructive,
            context: 'initiative_details',
            action: () => this.httpService.delete(`marketing/initiatives/${this.pivot?.marketing_initiative_id}/metrics/${this.id}`).subscribe(),
            roles: 'marketing'
        },
        {
            title: $localize`:@@i18n.common.delete:delete`,
            group: true,
            type: NxActionType.Destructive,
            context: '!initiative_details',
            action: () => this.confirm().then(() => this.httpService.delete(`marketing/performance-metrics/${this.id}`).subscribe()),
            hotkey: 'DEL',
            roles: 'marketing'
        }
    ];

    getIcon(): string {
        switch (this.metric_type) {
            case 'counter': return 'tag';
            case 'percentage': return 'percent';
            case 'conversion': return 'trending_up';
            case 'currency': return 'attach_money';
            case 'duration': return 'schedule';
            default: return 'analytics';
        }
    }

    getIconColor(): string {
        switch (this.metric_type) {
            case 'counter': return '#6366f1'; // Indigo
            case 'percentage': return '#10b981'; // Green
            case 'conversion': return '#f59e0b'; // Amber
            case 'currency': return '#06b6d4'; // Cyan
            case 'duration': return '#8b5cf6'; // Purple
            default: return '#6b7280'; // Gray
        }
    }

    formatValue(): string {
        const stats = this.activity_stats;
        if (!stats) return '';
        switch (this.metric_type) {
            case 'percentage':
            case 'conversion':
                return `${((stats.completed / stats.total) * 100).toFixed(1)}%`;
            case 'currency':
                return `$${stats.completed.toLocaleString()}`;
            case 'duration':
                return `${stats.completed}h`;
            default:
                return stats.completed.toString();
        }
    }

    formatTargetValue(): string {
        const value = this.target_value ?? 0;
        switch (this.metric_type) {
            case 'percentage':
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
}
