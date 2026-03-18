import { Serializable } from '../serializable';
import { MarketingService } from './marketing.service';
import { NxActionType } from 'src/app/nx/nx.actions';
import { AutoWrapArray } from '@constants/autowrap';
import { MarketingActivity, TActivityStats } from './marketing-activity.model';
import { MarketingInitiative } from './marketing-initiative.model';
import { TPivot } from './marketing-performance-metrics.model';

export interface TProspectStats {
    new: number;
    engaged: number;
    unresponsive: number;
    converted: number;
    disqualified: number;
    on_hold: number;
    total: number;
}

export class MarketingWorkflow extends Serializable {
    static API_PATH = (): string => 'marketing_workflows';
    SERVICE = MarketingService;

    name!: string;
    description?: string;
    is_active!: boolean;
    stats?: TActivityStats;
    prospects_count?: number;
    prospect_stats?: TProspectStats;
    pivot?: TPivot<'marketing_initiative', 'marketing_workflow'> & { is_active?: boolean };

    @AutoWrapArray('MarketingActivity') marketing_activities?: MarketingActivity[];
    @AutoWrapArray('MarketingInitiative') marketing_initiatives?: MarketingInitiative[];

    actions = [
        {
            title: $localize`:@@i18n.marketing.unlink_from_initiative:unlink from initiative`,
            group: true,
            type: NxActionType.Destructive,
            context: 'initiative_details',
            action: () => {
                const removeActivities = confirm(
                    'Do you also want to remove all prospect activities from this workflow?\n\n' +
                    'Click OK to remove activities, Cancel to keep them.'
                );
                this.httpService.delete(
                    `marketing/initiatives/${this.pivot?.marketing_initiative_id}/workflows/${this.id}`,
                    { body: { remove_prospect_activities: removeActivities } }
                ).subscribe();
            },
            roles: 'marketing'
        },
        {
            title: $localize`:@@i18n.common.delete:delete`,
            group: true,
            type: NxActionType.Destructive,
            context: '!initiative_details',
            action: () => this.confirm().then(() => this.httpService.delete(`marketing/workflows/${this.id}`).subscribe()),
            hotkey: 'DEL',
            roles: 'marketing'
        }
    ];
    
}
