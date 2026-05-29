import { Serializable } from '../serializable';
import { MarketingService } from './marketing.service';
import { Type } from 'class-transformer';
import { MarketingInitiative } from './marketing-initiative.model';
import { MarketingWorkflow } from './marketing-workflow.model';
import { MarketingPerformanceMetric } from './marketing-performance-metrics.model';
import { QuickActionType, TActivityStats } from './marketing-activity.model';
import { IActivityBase } from './activity-base.interface';
import { Model } from '@constants/type-discriminators';

@Model('MarketingInitiativeActivity')
export class MarketingInitiativeActivity extends Serializable implements IActivityBase {
    static API_PATH = (): string => 'marketing/initiative-activities';
    static DB_TABLE_NAME = (): string => 'marketing_initiative_activities';
    SERVICE = MarketingService;

    marketing_initiative_id!: string;
    marketing_workflow_id?: string;
    name!: string;
    day_offset!: number;
    description!: string | any;
    is_required!: boolean;
    has_external_dependency?: boolean;
    parent_activity_id?: string;
    quick_action?: QuickActionType;
    stats?: TActivityStats;

    // Relationships
    @Type(()=>MarketingInitiative) marketing_initiative?: MarketingInitiative;
    @Type(()=>MarketingWorkflow) marketing_workflow?: MarketingWorkflow;
    @Type(()=>MarketingInitiativeActivity) parent_activity?: MarketingInitiativeActivity;
    @Type(()=>MarketingInitiativeActivity) child_activities?: MarketingInitiativeActivity[];
    @Type(()=>MarketingPerformanceMetric) performance_metrics?: MarketingPerformanceMetric[];

    doubleClickAction = 0;
    actions = [];
}
