import { Serializable } from '../serializable';
import { MarketingService } from './marketing.service';
import { AutoWrap, AutoWrapArray } from '@constants/autowrap';
import { MarketingInitiative } from './marketing-initiative.model';
import { MarketingWorkflow } from './marketing-workflow.model';
import { MarketingPerformanceMetric } from './marketing-performance-metrics.model';
import { QuickActionType, TActivityStats } from './marketing-activity.model';
import { IActivityBase } from './activity-base.interface';

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
    @AutoWrap('MarketingInitiative') marketing_initiative?: MarketingInitiative;
    @AutoWrap('MarketingWorkflow') marketing_workflow?: MarketingWorkflow;
    @AutoWrap('MarketingInitiativeActivity') parent_activity?: MarketingInitiativeActivity;
    @AutoWrap('MarketingInitiativeActivity') child_activities?: MarketingInitiativeActivity[];
    @AutoWrapArray('MarketingPerformanceMetric') performance_metrics?: MarketingPerformanceMetric[];

    doubleClickAction = 0;
    actions = [];
}
