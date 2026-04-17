import { QuickActionType, TActivityStats } from './marketing-activity.model';
import { MarketingPerformanceMetric } from './marketing-performance-metrics.model';

/**
 * Base interface for all activity types (workflow activities, initiative activities, prospect activities)
 * Defines common properties shared across different activity contexts
 */
export interface IActivityBase {
    id: string;
    name: string;
    day_offset: number;
    description: string | any;
    is_required: boolean;
    has_external_dependency?: boolean;
    parent_activity_id?: string;
    quick_action?: QuickActionType;
    performance_metrics?: MarketingPerformanceMetric[];
    stats?: TActivityStats;
}
