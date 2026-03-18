import { Serializable } from '../serializable';
import { MarketingService } from './marketing.service';
import { NxActionType } from 'src/app/nx/nx.actions';
import { AutoWrapArray } from '@constants/autowrap';
import { MarketingPerformanceMetric, TPivot } from './marketing-performance-metrics.model';
import { MarketingWorkflow } from './marketing-workflow.model';
import { MarketingInitiativeActivity } from './marketing-initiative-activity.model';
import { User } from '@models/user/user.model';

export class MarketingInitiative extends Serializable {

    static API_PATH = (): string => 'marketing_initiatives';
    SERVICE = MarketingService;

    name!: string;
    description?: string;
    status!: 'active' | 'paused' | 'completed';
    start_date?: Date;
    end_date?: Date;
    parent_id?: number;
    pivot?: TPivot<'marketing_initiative', 'marketing_workflow'> & { is_active?: boolean };
    channels?: any[];
    prospects_count?: number;
    
    @AutoWrapArray('MarketingPerformanceMetric') performance_metrics?: MarketingPerformanceMetric[];
    @AutoWrapArray('MarketingWorkflow') workflows?: MarketingWorkflow[];
    @AutoWrapArray('MarketingInitiativeActivity') initiative_activities?: MarketingInitiativeActivity[];
    @AutoWrapArray('User') users?: User[];
    @AutoWrapArray('MarketingInitiative') children?: MarketingInitiative[];

    doubleClickAction = 0;
    actions = [
        {
            title: $localize`:@@i18n.common.open:open`,
            action: () => this.navigate(`/marketing/initiatives`)
        },
        {
            title: 'Change state to...',
            group: true,
            children: [
                {
                    title: 'Active',
                    on: () => this.status !== 'active',
                    action: () => {
                        this.httpService.put(`marketing/initiatives/${this.id}`, { status: 'active' }).subscribe(_ => this._serialize(_));
                    }
                },
                {
                    title: 'Paused',
                    on: () => this.status !== 'paused',
                    action: () => {
                        this.httpService.put(`marketing/initiatives/${this.id}`, { status: 'paused' }).subscribe(_ => this._serialize(_));
                    }
                },
                {
                    title: 'Completed',
                    on: () => this.status !== 'completed',
                    action: () => {
                        this.httpService.put(`marketing/initiatives/${this.id}`, { status: 'completed' }).subscribe(_ => this._serialize(_));
                    }
                }
            ]
        },
        {
            title: $localize`:@@i18n.common.delete:delete`,
            group: true,
            type: NxActionType.Destructive,
            action: () => this.confirm().then(() => this.httpService.delete(`marketing/initiatives/${this.id}`).subscribe()),
            hotkey: 'DEL',
            roles: 'marketing'
        }
    ];

}
