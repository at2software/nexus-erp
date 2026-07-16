import { Serializable } from '@models/serializable';
import { DebriefService } from './debrief.service';
import { User } from '@models/user/user.model';
import { Type } from 'class-transformer';
import { NxAction, NxActionType } from '@app/nx/nx.actions';
import { computed } from '@angular/core';
import { Model } from '@constants/type-discriminators';

@Model('DebriefSolution')
export class DebriefSolution extends Serializable {
    static override API_PATH = (): string => 'debrief_problem_solutions';
    override SERVICE = DebriefService;

    title: string = '';
    description?: string;
    created_by_user_id?: string;
    avg_effectiveness_rating?: number;
    usage_count: number = 0;
    
    pivot?: { effectiveness_rating?: number; notes?: string };

    @Type(()=>User) created_by?: User;

    effectiveness_rating = computed(() => this.pivot?.effectiveness_rating ?? 0);
    notes = computed(() => this.pivot?.notes ?? '');

    actions: NxAction[] = [
        {
            title: $localize`:@@i18n.common.delete:delete`,
            action: () => this.delete(),
            type: NxActionType.Destructive,
            group: true,
            hotkey: 'CTRL+DELETE',
            roles: 'project_manager',
        },
    ];

    getEffectivenessStars(): boolean[] {
        const rating = this.effectiveness_rating();
        return [1, 2, 3, 4, 5].map((i) => i <= rating);
    }
}
