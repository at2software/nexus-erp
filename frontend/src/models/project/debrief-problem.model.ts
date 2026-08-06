import type { NxAction } from '@models/_core/nx.actions';
import { Serializable } from '@models/_core/serializable';
import { DebriefService } from './debrief.service';
import { DebriefProblemCategory } from './debrief-problem-category.model';
import { DebriefSolution } from './debrief-solution.model';
import { User } from '@models/user/user.model';
import { signal, computed } from '@angular/core';
import { Type } from '@models/_core/hydrate';
import { map } from 'rxjs';
import { nx, TBroadcast } from '@models/_core/nx-bridge';
import { Model } from '@constants/model/type-discriminators';
import { DebriefProblemsActions } from './debrief-problem.actions';

@Model('DebriefProblem')
export class DebriefProblem extends Serializable {
    static override API_PATH = (): string => 'debriefs/problems';
    static DB_TABLE_NAME = (): string => 'debrief_problems';

    protected override buildActions(): NxAction[] { return DebriefProblemsActions(this) }

    title: string = '';
    description?: string;
    debrief_problem_category_id: string = '';
    created_by_user_id?: string;
    usage_count: number = 0;
    _parent = signal<{id: string} | undefined>(undefined);
    debrief_project_debrief_id = computed(() => this._parent()?.id ?? '');
    severity: 'low' | 'medium' | 'high' | 'critical' | undefined = undefined;
    category_name?: string;
    category_color?: string;

    pivot?: { severity?: string; context_notes?: string };

    context_notes = computed(() => this.snapshot()['pivot']?.context_notes ?? '');

    @Type(()=>DebriefProblemCategory) category!: DebriefProblemCategory;
    @Type(()=>User) created_by?: User;
    @Type(()=>DebriefSolution) solutions: DebriefSolution[] = [];

    override afterDeserialize(json: unknown, seen?: WeakSet<Serializable>): void {
        super.afterDeserialize(json, seen);
        const pivotSeverity = (json as { pivot?: { severity?: string } })?.pivot?.severity;
        if (!this.severity && pivotSeverity) this.severity = pivotSeverity as DebriefProblem['severity'];
    }

    override delete() {
        if (this.debrief_project_debrief_id()) {
            return nx().getService(DebriefService)
                .detachProblem(this.debrief_project_debrief_id(), this.id)
                .pipe(
                    map(() => {
                        nx().broadcast({ type: TBroadcast.Delete, data: this });
                        return this;
                    }),
                );
        }
        return super.delete();
    }
}
