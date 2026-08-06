import { Serializable } from '@models/_core/serializable';
import { Project } from './project.model';
import { User } from '@models/user/user.model';
import { DebriefProblem } from './debrief-problem.model';
import { DebriefPositive } from './debrief-positive.model';
import { computed } from '@angular/core';
import { Type } from '@models/_core/hydrate';
import { Model } from '@constants/model/type-discriminators';

@Model('DebriefProjectDebrief')
export class DebriefProjectDebrief extends Serializable {
    static override API_PATH = (): string => 'debriefs';
    static override DB_TABLE_NAME = (): string => 'debrief_project_debriefs';

    project_id: string = '';
    conducted_by_user_id?: string;
    conducted_at?: string;
    summary_notes?: string;
    rating?: number;
    status: 'draft' | 'completed' = 'draft';
    debriefed_user_id?: string;

    @Type(()=>Project) project!: Project;
    @Type(()=>User) conducted_by?: User;
    @Type(()=>User) debriefed_user?: User;
    
    #problems: DebriefProblem[] = [];
    get problems(): DebriefProblem[] { return this.#problems; }
    set problems(values: unknown[]) {
        if (!Array.isArray(values)) return;
        this.#problems = values.map((v) => DebriefProblem.fromJson(v));
        this.#problems.forEach(p => p._parent.set(this));
    }

    #positives: DebriefPositive[] = [];
    get positives(): DebriefPositive[] { return this.#positives; }
    set positives(values: unknown[]) {
        if (!Array.isArray(values)) return;
        this.#positives = values.map((v) => DebriefPositive.fromJson(v));
        this.#positives.forEach(p => p._parent.set(this));
    }

    isCompleted = computed((): boolean => { this.snapshot(); return this.status === 'completed'; });
    isDraft = computed((): boolean => { this.snapshot(); return this.status === 'draft'; });

    getProblemsByCategory(): Map<string, DebriefProblem[]> {
        const map = new Map<string, DebriefProblem[]>();
        this.problems.forEach((problem) => {
            const categoryId = problem.debrief_problem_category_id;
            if (!map.has(categoryId)) {
                map.set(categoryId, []);
            }
            map.get(categoryId)!.push(problem);
        });
        return map;
    }

    getSeverityCounts(): { low: number; medium: number; high: number; critical: number } {
        const counts = { low: 0, medium: 0, high: 0, critical: 0 };
        this.problems.forEach((problem) => {
            if (problem.severity) {
                counts[problem.severity]++;
            }
        });
        return counts;
    }
}
