import { Serializable } from '../serializable';
import { MarketingService } from './marketing.service';
import { NxActionType } from '@app/nx/nx.actions';
import { Type } from 'class-transformer';
import { MarketingActivity } from './marketing-activity.model';
import { MarketingInitiative } from './marketing-initiative.model';
import { TPivot } from './marketing-performance-metrics.model';
import { Model } from '@constants/type-discriminators';
import type { ActivityStats } from '@models/api-response';

export interface TProspectStats {
    new: number;
    engaged: number;
    unresponsive: number;
    converted: number;
    disqualified: number;
    on_hold: number;
    total: number;
}

@Model('MarketingWorkflow')
export class MarketingWorkflow extends Serializable {
    static API_PATH = (): string => 'marketing_workflows';
    SERVICE = MarketingService;

    name!: string;
    description?: string;
    is_active!: boolean;
    stats?: ActivityStats;
    prospects_count?: number;
    prospect_stats?: TProspectStats;
    pivot?: TPivot<'marketing_initiative', 'marketing_workflow'> & { is_active?: boolean };

    @Type(()=>MarketingActivity) marketing_activities?: MarketingActivity[];
    @Type(()=>MarketingInitiative) marketing_initiatives?: MarketingInitiative[];

    actions = [
        {
            title: $localize`:@@i18n.marketing.unlink_from_initiative:unlink from initiative`,
            group: true,
            type: NxActionType.Destructive,
            context: 'initiative_details',
            action: () => {
                const removeActivities = confirm('Do you also want to remove all prospect activities from this workflow?\n\n' + 'Click OK to remove activities, Cancel to keep them.');
                this.httpService.delete(`marketing/initiatives/${this.pivot?.marketing_initiative_id}/workflows/${this.id}`, { body: { remove_prospect_activities: removeActivities } }).subscribe();
            },
            roles: 'marketing',
        },
        {
            title: $localize`:@@i18n.common.delete:delete`,
            group: true,
            type: NxActionType.Destructive,
            context: '!initiative_details',
            action: () => this.modalConfirm().then(() => this.httpService.delete(`marketing/workflows/${this.id}`).subscribe()),
            hotkey: 'DEL',
            roles: 'marketing',
        },
    ];
}
