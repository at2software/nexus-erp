import { Serializable } from '../serializable';
import { MarketingService } from './marketing.service';
import { AutoWrap } from '@constants/autowrap';
import { MarketingProspect } from './marketing.prospect.model';
import { MarketingActivity } from './marketing-activity.model';
import { MarketingInitiativeActivity } from './marketing-initiative-activity.model';

export class MarketingProspectActivity extends Serializable {
    static API_PATH = (): string => 'marketing/prospects/activity';
    static DB_TABLE_NAME = (): string => 'marketing_prospect_activities';
    SERVICE = MarketingService;

    marketing_prospect_id!: string;
    marketing_initiative_activity_id!: string;
    scheduled_at!: string;
    completed_at?: string;
    status!: 'pending' | 'completed' | 'skipped' | 'overdue' | 'failed';
    notes?: string;
    performance_value?: number;

    // Relationships
    @AutoWrap('MarketingProspect') marketing_prospect?: MarketingProspect;
    @AutoWrap('MarketingInitiativeActivity') marketing_initiative_activity?: MarketingInitiativeActivity;
    
    // Legacy support - for backwards compatibility
    get marketing_activity(): MarketingInitiativeActivity | undefined {
        return this.marketing_initiative_activity;
    }

    doubleClickAction = 0;
    actions = [
        {
            title: $localize`:@@i18n.common.edit:edit`,
            action: () => {
                const context = (this as any).__nxContext;
                if (context?.component) {
                    context.component.openEditActivityModal?.(this);
                }
            }
        },
        {
            title: $localize`:@@i18n.common.change_state:change state`,
            group: true,
            children: [
                {
                    title: $localize`:@@i18n.marketing.mark_as_completed:mark as completed`,
                    group: true,
                    action: () => this.update({ status: 'completed' }).subscribe()
                },
                {
                    title: $localize`:@@i18n.tasks.reopen:reopen`,
                    group: true,
                    action: () => this.update({ status: 'pending' }).subscribe()
                },
                {
                    title: $localize`:@@i18n.marketing.skip_activity:skip activity`,
                    group: true,
                    action: () => this.update({ status: 'skipped' }).subscribe()
                },
                {
                    title: $localize`:@@i18n.common.overdue:overdue`,
                    group: true,
                    action: () => this.update({ status: 'overdue' }).subscribe()
                },
                {
                    title: $localize`:@@i18n.marketing.failed:failed`,
                    group: true,
                    action: () => this.update({ status: 'failed' }).subscribe()
                },
            ]
        },
    ];
}
