import { Serializable } from '@models/serializable';
import { DebriefService } from './debrief.service';
import { DebriefProblemCategory } from './debrief-problem-category.model';
import { DebriefSolution } from './debrief-solution.model';
import { User } from '@models/user/user.model';
import { signal, computed } from '@angular/core';
import { Type } from 'class-transformer';
import { tap } from 'rxjs';
import { NxGlobal, TBroadcast } from '@app/nx/nx.global';
import { Model } from '@constants/type-discriminators';
import { DebriefProblemsActions } from './debrief-problem.actions';

@Model('DebriefProblem')
export class DebriefProblem extends Serializable {
    static override API_PATH = (): string => 'debriefs/problems';
    static DB_TABLE_NAME = (): string => 'debrief_problems';
    override SERVICE = DebriefService;

    actions = DebriefProblemsActions(this);

    title: string = '';
    description?: string;
    debrief_problem_category_id: string = '';
    created_by_user_id?: string;
    usage_count: number = 0;
    _parent = signal<{id: string} | undefined>(undefined);
    debrief_project_debrief_id = computed(() => this._parent()?.id ?? '');
    severity: 'low' | 'medium' | 'high' | 'critical' | undefined = undefined;

    // Raw pivot data from Laravel
    pivot?: { severity?: string; context_notes?: string };

    //severity = computed(() => this.snapshot()['pivot']?.severity as 'low' | 'medium' | 'high' | 'critical' | undefined);
    context_notes = computed(() => this.snapshot()['pivot']?.context_notes ?? '');

    @Type(()=>DebriefProblemCategory) category!: DebriefProblemCategory;
    @Type(()=>User) created_by?: User;
    @Type(()=>DebriefSolution) solutions: DebriefSolution[] = [];

    override delete() {
        if (this.debrief_project_debrief_id()) {
            return NxGlobal.getService(DebriefService)
                .detachProblem(this.debrief_project_debrief_id(), this.id)
                .pipe(tap(() => NxGlobal.broadcast({ type: TBroadcast.Delete, data: this })));
        }
        return super.delete();
    }
}
