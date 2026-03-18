import { Injectable } from '@angular/core'
import { Observable, map } from 'rxjs'
import { NexusHttpService } from '@models/http/http.nexus'
import { DebriefProblemCategory } from './debrief-problem-category.model'
import { DebriefProblem } from './debrief-problem.model'
import { DebriefSolution } from './debrief-solution.model'
import { DebriefProjectDebrief } from './debrief-project-debrief.model'
import { DebriefPositive } from './debrief-positive.model'

export interface DebriefStats {
    total_debriefs: number
    completed_debriefs: number
    draft_debriefs: number
    total_problems_recorded: number
    avg_problems_per_debrief: number
    avg_solution_effectiveness: number
    total_unique_problems: number
    total_unique_solutions: number
}

export interface CategoryBreakdown {
    category_id: string
    category_name: string
    category_color: string
    category_icon: string
    total_problems: number
    severity_counts: { low: number, medium: number, high: number, critical: number }
    weighted_score: number
    problems?: { id: string, title: string, severity?: string, usage_count?: number }[]
}

export interface TopSolution {
    id: string
    title: string
    avg_effectiveness: number
    usage_count: number
}

export interface CategoryBreakdownPositives {
    category_id: string
    category_name: string
    category_color: string
    category_icon: string
    total_positives: number
}

export interface TrendData {
    month: string
    debriefs_count: number
    problems_count: number
}

@Injectable({ providedIn: 'root' })
export class DebriefService extends NexusHttpService<DebriefProjectDebrief> {
    public apiPath = 'debriefs'
    public TYPE = () => DebriefProjectDebrief

    // Categories
    indexCategories = (): Observable<DebriefProblemCategory[]> =>
        this.aget('debriefs/categories', {}, DebriefProblemCategory)

    // Problems
    indexProblems = (filters?: any): Observable<DebriefProblem[]> =>
        this.paginate('debriefs/problems', filters)

    searchProblems = (q: string, categoryId?: string): Observable<DebriefProblem[]> =>
        this.aget('debriefs/problems/search', categoryId ? { q, category_id: categoryId } : { q }, DebriefProblem)

    storeProblem = (data: Partial<DebriefProblem>): Observable<DebriefProblem> =>
        this.post('debriefs/problems', data, DebriefProblem)

    showProblem = (id: string): Observable<DebriefProblem> =>
        this.get(`debriefs/problems/${id}`, {})

    updateProblem = (id: string, data: Partial<DebriefProblem>): Observable<DebriefProblem> =>
        this.put(`debriefs/problems/${id}`, data, DebriefProblem)

    destroyProblem = (id: string): Observable<void> =>
        this.delete(`debriefs/problems/${id}`)

    // Solutions
    indexSolutions = (filters?: any): Observable<DebriefSolution[]> =>
        this.paginate('debriefs/solutions', filters)

    searchSolutions = (q: string): Observable<DebriefSolution[]> =>
        this.aget('debriefs/solutions/search', { q }, DebriefSolution)

    storeSolution = (data: Partial<DebriefSolution>): Observable<DebriefSolution> =>
        this.post('debriefs/solutions', data, DebriefSolution)

    updateSolution = (id: string, data: Partial<DebriefSolution>): Observable<DebriefSolution> =>
        this.put(`debriefs/solutions/${id}`, data, DebriefSolution)

    destroySolution = (id: string): Observable<void> =>
        this.delete(`debriefs/solutions/${id}`)

    // Problem-Solution Links
    linkSolution = (problemId: string, solutionId: string, debriefId?: string, rating?: number): Observable<DebriefProblem> =>
        this.post(`debriefs/problems/${problemId}/solutions`, {
            debrief_solution_id: solutionId,
            debrief_project_debrief_id: debriefId,
            effectiveness_rating: rating
        }, DebriefProblem)

    rateSolution = (problemId: string, solutionId: string, rating: number, notes?: string): Observable<DebriefProblem> =>
        this.put(`debriefs/problems/${problemId}/solutions/${solutionId}`, {
            effectiveness_rating: rating,
            notes
        }, DebriefProblem)

    unlinkSolution = (problemId: string, solutionId: string): Observable<void> =>
        this.delete(`debriefs/problems/${problemId}/solutions/${solutionId}`)

    // Project Debriefs
    indexDebriefs = (filters?: any): Observable<DebriefProjectDebrief[]> =>
        this.paginate('debriefs', filters)

    indexProjectDebriefs = (projectId: string): Observable<DebriefProjectDebrief[]> =>
        this.aget(`projects/${projectId}/debriefs`, {}, DebriefProjectDebrief)

    createProjectDebrief = (projectId: string): Observable<DebriefProjectDebrief> =>
        this.post(`projects/${projectId}/debriefs`, {}, DebriefProjectDebrief)

    updateDebrief = (id: string, data: Partial<DebriefProjectDebrief>): Observable<DebriefProjectDebrief> =>
        this.put(`debriefs/${id}`, data, DebriefProjectDebrief)

    deleteDebrief = (id: string): Observable<void> =>
        this.delete(`debriefs/${id}`)

    // Problem-Debrief Links
    attachProblem = (debriefId: string, problemId: string, severity?: string, contextNotes?: string): Observable<DebriefProjectDebrief> =>
        this.post(`debriefs/${debriefId}/problems`, {
            debrief_problem_id: problemId,
            severity,
            context_notes: contextNotes
        }, DebriefProjectDebrief)

    updateProblemSeverity = (debriefId: string, problemId: string, severity: string, contextNotes?: string): Observable<DebriefProjectDebrief> =>
        this.put(`debriefs/${debriefId}/problems/${problemId}`, {
            severity,
            context_notes: contextNotes
        }, DebriefProjectDebrief)

    detachProblem = (debriefId: string, problemId: string): Observable<void> =>
        this.delete(`debriefs/${debriefId}/problems/${problemId}`)

    // Positives
    storePositive = (debriefId: string, data: Partial<DebriefPositive>): Observable<DebriefPositive> =>
        this.post(`debriefs/${debriefId}/positives`, data, DebriefPositive)

    updatePositive = (id: string, data: Partial<DebriefPositive>): Observable<DebriefPositive> =>
        this.put(`debriefs/positives/${id}`, data, DebriefPositive)

    destroyPositive = (id: string): Observable<void> =>
        this.delete(`debriefs/positives/${id}`)

    // Analytics
    getStatsAggregated = (filters?: any): Observable<DebriefStats> =>
        this.get('debriefs/stats/aggregated', filters) as Observable<DebriefStats>

    getStatsCategories = (filters?: any): Observable<CategoryBreakdown[]> =>
        this.aget('debriefs/stats/categories', filters) as Observable<CategoryBreakdown[]>

    getStatsTopProblems = (limit?: number, filters?: any): Observable<DebriefProblem[]> =>
        (this.aget('debriefs/stats/top-problems', { limit, ...filters }) as Observable<any[]>).pipe(
            map(items => items.map(raw => {
                const p = DebriefProblem.fromJson({ id: raw.id, title: raw.title, usage_count: raw.usage_count })
                p.var.category_name = raw.category
                p.var.category_color = raw.category_color
                return p
            }))
        )

    getStatsTopSolutions = (limit?: number): Observable<TopSolution[]> =>
        this.aget('debriefs/stats/top-solutions', { limit }) as Observable<TopSolution[]>

    getStatsTopPositives = (limit?: number, filters?: any): Observable<DebriefPositive[]> =>
        (this.aget('debriefs/stats/top-positives', { limit, ...filters }) as Observable<any[]>).pipe(
            map(items => items.map(raw => {
                const p = DebriefPositive.fromJson({ id: raw.id, title: raw.title })
                p.var.category_name = raw.category
                p.var.category_color = raw.category_color
                p.var.count = raw.count
                return p
            }))
        )

    getStatsCategoriesPositives = (filters?: any): Observable<CategoryBreakdownPositives[]> =>
        this.aget('debriefs/stats/categories-positives', filters) as Observable<CategoryBreakdownPositives[]>

    getStatsTrends = (months?: number): Observable<TrendData[]> =>
        this.aget('debriefs/stats/trends', { months }) as Observable<TrendData[]>
}
