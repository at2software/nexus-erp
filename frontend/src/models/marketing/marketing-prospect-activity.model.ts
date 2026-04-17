import { Serializable } from '../serializable';
import { MarketingService } from './marketing.service';
import { AutoWrap } from '@constants/autowrap';
import { MarketingProspect } from './marketing.prospect.model';
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

    isOverdue = () => new Date(this.scheduled_at) < new Date()
    override getName = () => this.marketing_initiative_activity?.name || $localize`:@@i18n.marketing.prospectActivity:prospect activity`

    #postpone(days: number) {
        this.httpService.post(`marketing/prospects/${this.marketing_prospect_id}/postpone-activities`, { days }).subscribe()
    }
    #postponeDays(days: number) { this.#postpone(days) }
    #postponeMonths(months: number) { this.#postpone(months * 30) }

    doubleClickAction = 0;
    actions = [
        {
            title: $localize`:@@i18n.common.view:view`,
            action: () => {
                const context = (this as any).__nxContext;
                if (context?.router) {
                    context.router.navigate(['/marketing/prospects', this.marketing_prospect_id]);
                } else if (typeof window !== 'undefined') {
                    window.location.href = `/marketing/prospects/${this.marketing_prospect_id}`;
                }
            }
        },
        {
            title: $localize`:@@i18n.common.reopen:reopen`,
            on: () => this.status !== 'pending',
            group: true,
            action: () => this.update({ status: 'pending' }).subscribe()
        },
        {
            title: $localize`:@@i18n.marketing.mark_as_completed:mark as completed`,
            on: () => this.status === 'pending',
            group: true,
            action: () => this.update({ status: 'completed' }).subscribe()
        },
        // {
        //     title: $localize`:@@i18n.common.edit:edit`,
        //     action: () => {
        //         const context = (this as any).__nxContext;
        //         if (context?.component) {
        //             context.component.openEditActivityModal?.(this);
        //         }
        //     }
        // },
        {
            title: $localize`:@@i18n.marketing.postpone:postpone`,
            group: true,
            children: [
                { group:true, title: $localize`:@@i18n.marketing.postpone_1w:1 week`, action: () => this.#postponeDays(7) },
                { group:true, title: $localize`:@@i18n.marketing.postpone_2w:2 weeks`, action: () => this.#postponeDays(14) },
                { group:true, title: $localize`:@@i18n.marketing.postpone_1m:1 month`, action: () => this.#postponeMonths(1) },
                { group:true, title: $localize`:@@i18n.marketing.postpone_2m:2 months`, action: () => this.#postponeMonths(2) },
                { group:true, title: $localize`:@@i18n.marketing.postpone_3m:3 months`, action: () => this.#postponeMonths(3) },
                { group:true, title: $localize`:@@i18n.marketing.postpone_6m:6 months`, action: () => this.#postponeMonths(6) },
                { group:true, title: $localize`:@@i18n.marketing.postpone_12m:12 months`, action: () => this.#postponeMonths(12) },
            ]
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
