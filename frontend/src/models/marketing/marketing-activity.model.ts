import { Serializable } from '../serializable';
import { MarketingService } from './marketing.service';
import { NxActionType } from 'src/app/nx/nx.actions';
import { AutoWrapArray } from '@constants/autowrap';
import { MarketingPerformanceMetric } from './marketing-performance-metrics.model';
import { IActivityBase } from './activity-base.interface';

/**
 * Centralized type for activity statistics
 * Used by both MarketingActivity.stats and MarketingPerformanceMetric.activity_stats
 */
export interface TActivityStats {
    total: number;
    pending: number;
    overdue: number;
    completed: number;
    skipped: number;
    pending_percentage: number;
    overdue_percentage: number;
    completed_percentage: number;
    skipped_percentage: number;
}

export type QuickActionType = 'EMAIL' | 'LINKEDIN' | 'LINKEDIN_SEARCH' | 'CALL' | null;

export class MarketingActivity extends Serializable implements IActivityBase {
    static API_PATH = (): string => 'marketing_activities';
    static STATS_COLORS = {
        completed: 'bg-success',
        overdue: 'bg-danger',
        pending: 'bg-dark-grey',
        skipped: 'bg-purple'
    };

    SERVICE = MarketingService;

    marketing_workflow_id!: string;
    name!: string;
    day_offset!: number;
    description!: string | { language: string, formality: string, text: string }[];
    is_required!: boolean;
    has_external_dependency!: boolean;
    parent_activity_id?: string;
    quick_action?: QuickActionType;

    // Stats added dynamically by backend
    stats?: TActivityStats;

    @AutoWrapArray('MarketingPerformanceMetric') performance_metrics?: MarketingPerformanceMetric[];
    @AutoWrapArray('MarketingActivity') child_activities?: MarketingActivity[];
    parent_activity?: MarketingActivity;

    doubleClickAction = 0;
    actions = [
        {
            title: $localize`:@@i18n.common.edit:edit`,
            action: () => {
                const context = (this as any).__nxContext;
                if (context?.component) {
                    context.component.openEditActivityModal(this);
                }
            }
        },
        {
            title: $localize`:@@i18n.marketing.mark_as_required:mark as required`,
            on: () => !this.is_required,
            action: () => {
                this.httpService.put(`marketing/workflows/${this.marketing_workflow_id}/activities/${this.id}`, { is_required: true })
                    .subscribe(() => this.is_required = true);
            }
        },
        {
            title: $localize`:@@i18n.marketing.mark_as_optional:mark as optional`,
            on: () => this.is_required,
            action: () => {
                this.httpService.put(`marketing/workflows/${this.marketing_workflow_id}/activities/${this.id}`, { is_required: false })
                    .subscribe(() => this.is_required = false);
            }
        },
        {
            title: $localize`:@@i18n.marketing.add_external_dependency:add external dependency`,
            on: () => !this.has_external_dependency,
            action: () => {
                this.httpService.put(`marketing/workflows/${this.marketing_workflow_id}/activities/${this.id}`, { has_external_dependency: true })
                    .subscribe(() => this.has_external_dependency = true);
            }
        },
        {
            title: $localize`:@@i18n.marketing.remove_external_dependency:remove external dependency`,
            on: () => this.has_external_dependency,
            action: () => {
                this.httpService.put(`marketing/workflows/${this.marketing_workflow_id}/activities/${this.id}`, { has_external_dependency: false })
                    .subscribe(() => this.has_external_dependency = false);
            }
        },
        {
            title: $localize`:@@i18n.common.delete:delete`,
            group: true,
            type: NxActionType.Destructive,
            action: () => this.confirm().then(() => {
                this.httpService.delete(`marketing/workflows/${this.marketing_workflow_id}/activities/${this.id}`).subscribe();
            }),
            roles: 'marketing'
        }
    ];

}
