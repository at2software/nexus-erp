import { Serializable } from '../serializable';
import { MarketingService } from './marketing.service';
import { NxActionType } from '@app/nx/nx.actions';
import { Type } from 'class-transformer';
import { MarketingPerformanceMetric } from './marketing-performance-metrics.model';
import { IActivityBase } from './activity-base.interface';
import { Model } from '@constants/type-discriminators';
import type { ActivityStats } from '@models/api-response';

export type QuickActionType = 'EMAIL' | 'LINKEDIN' | 'LINKEDIN_SEARCH' | 'CALL' | null;

@Model('MarketingActivity')
export class MarketingActivity extends Serializable implements IActivityBase {
    static API_PATH = (): string => 'marketing_activities';
    static STATS_COLORS = {
        completed: 'bg-success',
        overdue: 'bg-danger',
        pending: 'bg-dark-grey',
        skipped: 'bg-purple',
    };

    SERVICE = MarketingService;

    marketing_workflow_id!: string;
    name!: string;
    day_offset!: number;
    description!: string | { language: string; formality: string; text: string }[];
    is_required!: boolean;
    has_external_dependency!: boolean;
    parent_activity_id?: string;
    quick_action?: QuickActionType;

    // Stats added dynamically by backend
    stats?: ActivityStats;

    @Type(()=>MarketingPerformanceMetric) performance_metrics?: MarketingPerformanceMetric[];
    @Type(()=>MarketingActivity) child_activities?: MarketingActivity[];
    @Type(()=>MarketingActivity) parent_activity?: MarketingActivity;

    doubleClickAction = 0;
    actions = [
        {
            title: $localize`:@@i18n.common.edit:edit`,
            action: () => {
                const context = (this as any).__nxContext;
                if (context?.component) {
                    context.component.openEditActivityModal(this);
                }
            },
        },
        {
            title: $localize`:@@i18n.marketing.mark_as_required:mark as required`,
            on: () => !this.is_required,
            action: () => {
                this.update({ is_required: true }).subscribe();
            },
        },
        {
            title: $localize`:@@i18n.marketing.mark_as_optional:mark as optional`,
            on: () => this.is_required,
            action: () => {
                this.update({ is_required: false }).subscribe();
            },
        },
        {
            title: $localize`:@@i18n.marketing.add_external_dependency:add external dependency`,
            on: () => !this.has_external_dependency,
            action: () => {
                this.update({ has_external_dependency: true }).subscribe();
            },
        },
        {
            title: $localize`:@@i18n.marketing.remove_external_dependency:remove external dependency`,
            on: () => this.has_external_dependency,
            action: () => {
                this.update({ has_external_dependency: false }).subscribe();
            },
        },
        {
            title: $localize`:@@i18n.common.delete:delete`,
            group: true,
            type: NxActionType.Destructive,
            action: () =>
                this.modalConfirm().then(() => {
                    this.delete().subscribe();
                }),
            roles: 'marketing',
        },
    ];
}
