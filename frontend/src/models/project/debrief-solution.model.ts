import { Serializable } from '@models/_core/serializable';
import { User } from '@models/user/user.model';
import { Type } from '@models/_core/hydrate';
import { NxAction, NxActionType } from '@models/_core/nx.actions';
import { computed } from '@angular/core';
import { Model } from '@constants/model/type-discriminators';

@Model('DebriefSolution')
export class DebriefSolution extends Serializable {
    static override API_PATH = (): string => 'debrief_problem_solutions';

    title: string = '';
    description?: string;
    created_by_user_id?: string;
    avg_effectiveness_rating?: number;
    usage_count: number = 0;
    
    pivot?: { effectiveness_rating?: number; notes?: string };

    @Type(()=>User) created_by?: User;

    effectiveness_rating = computed(() => { this.snapshot(); return this.pivot?.effectiveness_rating ?? 0; });
    notes = computed(() => { this.snapshot(); return this.pivot?.notes ?? ''; });

    protected override buildActions(): NxAction[] {
        return [
            {
                title: $localize`:@@i18n.common.delete:delete`,
                action: () => this.delete(),
                type: NxActionType.Destructive,
                group: true,
                hotkey: 'CTRL+DELETE',
                roles: 'project_manager',
            },
        ];
    }

    getEffectivenessStars(): boolean[] {
        const rating = this.effectiveness_rating();
        return [1, 2, 3, 4, 5].map((i) => i <= rating);
    }
}
