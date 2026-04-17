import { Component, OnInit, inject } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { NgbTooltipModule, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap'
import { forkJoin } from 'rxjs'
import { DebriefService, CategoryBreakdown } from '@models/project/debrief.service'
import { DebriefProjectDebrief } from '@models/project/debrief-project-debrief.model'
import { DebriefProblem } from '@models/project/debrief-problem.model'
import { DebriefProblemCategory } from '@models/project/debrief-problem-category.model'
import { DebriefPositive } from '@models/project/debrief-positive.model'
import { User } from '@models/user/user.model'
import { ProjectDetailGuard } from '@app/projects/project-details.guard'
import { DebriefProblemAutocompleteComponent } from '@app/projects/_shards/debrief-problem-autocomplete/debrief-problem-autocomplete.component'
import { DebriefPositiveAutocompleteComponent } from '@app/projects/_shards/debrief-positive-autocomplete/debrief-positive-autocomplete.component'
import { DebriefSolutionInlineComponent } from '@app/projects/_shards/debrief-solution-inline/debrief-solution-inline.component'
import { DebriefRadarChartComponent } from '@app/projects/_shards/debrief-radar-chart/debrief-radar-chart.component'
import { NexusModule } from '@app/nx/nexus.module'
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component'
import { Toast } from '@shards/toast/toast'
import { AutosaveDirective } from '@directives/autosave.directive'
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component'
import { PluginInstanceFactory } from '@models/http/plugin.instance.factory'
import { LocalAIPlugin } from '@models/http/plugin.localai'

type Severity = 'low' | 'medium' | 'high' | 'critical'

interface AISuggestion {
    type: 'problem' | 'positive'
    title: string
    category?: string
    severity?: Severity
}

@Component({
    selector: 'project-debriefing',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        NgbTooltipModule,
        NgbDropdownModule,
        NexusModule,
        ToolbarComponent,
        DebriefProblemAutocompleteComponent,
        DebriefPositiveAutocompleteComponent,
        DebriefSolutionInlineComponent,
        DebriefRadarChartComponent,
        AutosaveDirective,
        EmptyStateComponent
    ],
    templateUrl: './project-debriefing.component.html',
    styleUrls: ['./project-debriefing.component.scss']
})
export class ProjectDebriefingComponent implements OnInit {
    loading = true
    creating = false
    debriefs: DebriefProjectDebrief[] = []
    categories: DebriefProblemCategory[] = []
    expandedProblemId: string | null = null

    // Per-debrief state keyed by debrief ID
    severityMap: Record<string, Severity> = {}

    // Local AI state
    aiLoadingMap: Record<string, boolean> = {}
    aiSuggestionsMap: Record<string, AISuggestion[]> = {}

    #service = inject(DebriefService)
    #guard = inject(ProjectDetailGuard)
    #pluginFactory = inject(PluginInstanceFactory)

    get projectId(): string {
        return this.#guard.current?.id || ''
    }

    get projectUsers() {
        return this.#guard.current?.getAssignedUsers().map(a => a.assignee as User) || []
    }

    get localAiPlugin(): LocalAIPlugin | null {
        const encs = this.#pluginFactory.getPluginEncryptionsOfType('local_ai')
        if (!encs.length) return null
        const plugin = this.#pluginFactory.instanceFor(encs[0]) as LocalAIPlugin
        return plugin?.state === 'connected' ? plugin : null
    }

    ngOnInit() {
        this.loadData()
    }

    loadData() {
        this.loading = true

        forkJoin([
            this.#service.indexCategories(),
            this.#service.indexProjectDebriefs(this.projectId)
        ]).subscribe({
            next: ([categories, debriefs]: [DebriefProblemCategory[], DebriefProjectDebrief[]]) => {
                this.categories = categories || []
                this.debriefs = debriefs || []
                this.loading = false
            },
            error: () => this.loading = false
        })
    }

    createDebrief() {
        this.creating = true
        this.#service.createProjectDebrief(this.projectId).subscribe({
            next: debrief => {
                this.debriefs = [debrief, ...this.debriefs]
                this.creating = false
                Toast.success($localize`:@@i18n.debrief.created:New debrief created`)
            },
            error: () => this.creating = false
        })
    }

    getCategoryBreakdown(debrief: DebriefProjectDebrief): CategoryBreakdown[] {
        return this.categories.map(cat => {
            const problems = debrief.problems.filter(p => p.debrief_problem_category_id === cat.id)
            const severityCounts = { low: 0, medium: 0, high: 0, critical: 0 }
            problems.forEach(p => { severityCounts[p.severity || 'medium']++ })
            const weights = { low: 1, medium: 2, high: 3, critical: 4 }
            const weightedScore = Object.entries(severityCounts).reduce((sum, [sev, count]) =>
                sum + count * weights[sev as Severity], 0)
            return {
                category_id: cat.id,
                category_name: cat.name,
                category_color: cat.color,
                category_icon: cat.categoryIcon || '',
                total_problems: problems.length,
                severity_counts: severityCounts,
                weighted_score: weightedScore,
                problems
            }
        })
    }

    getSelectedSeverity(debriefId: string): Severity {
        return this.severityMap[debriefId] || 'medium'
    }

    setSelectedSeverity(debriefId: string, severity: Severity) {
        this.severityMap[debriefId] = severity
    }

    getExcludedProblemIds(debrief: DebriefProjectDebrief): string[] {
        return debrief.problems.map(p => p.id)
    }

    reloadDebrief(_debriefId: string) {
        this.#service.indexProjectDebriefs(this.projectId).subscribe(debriefs => {
            this.debriefs = debriefs || []
        })
    }

    onProblemSelected(debrief: DebriefProjectDebrief, problem: DebriefProblem) {
        this.#service.attachProblem(debrief.id, problem.id, this.getSelectedSeverity(debrief.id)).subscribe(() => {
            this.reloadDebrief(debrief.id)
            Toast.success($localize`:@@i18n.debrief.problemAdded:Problem added`)
        })
    }

    onCreateProblem(debrief: DebriefProjectDebrief, event: { title: string, categoryId: string }) {
        this.#service.storeProblem({
            title: event.title,
            debrief_problem_category_id: event.categoryId
        }).subscribe(problem => {
            this.#service.attachProblem(debrief.id, problem.id, this.getSelectedSeverity(debrief.id)).subscribe(() => {
                this.reloadDebrief(debrief.id)
                Toast.success($localize`:@@i18n.debrief.problemCreated:Problem created and added`)
            })
        })
    }

    toggleProblem(problem: DebriefProblem) {
        this.expandedProblemId = this.expandedProblemId === problem.id ? null : problem.id
    }

    updateProblemSeverity(debrief: DebriefProjectDebrief, problem: DebriefProblem, severity: Severity) {
        this.#service.updateProblemSeverity(debrief.id, problem.id, severity).subscribe(() => {
            this.reloadDebrief(debrief.id)
        })
    }

    updateProblemCategory(debrief: DebriefProjectDebrief, problem: DebriefProblem, categoryId: string) {
        this.#service.updateProblem(problem.id, { debrief_problem_category_id: categoryId }).subscribe(() => {
            this.reloadDebrief(debrief.id)
        })
    }

    removeProblem(debrief: DebriefProjectDebrief, problem: DebriefProblem) {
        this.#service.detachProblem(debrief.id, problem.id).subscribe(() => {
            if (this.expandedProblemId === problem.id) this.expandedProblemId = null
            this.reloadDebrief(debrief.id)
        })
    }

    onAddPositive(debrief: DebriefProjectDebrief, event: { title: string, categoryId?: string, existingId?: string }) {
        this.#service.storePositive(debrief.id, {
            title: event.title,
            debrief_problem_category_id: event.categoryId || undefined,
            ...(event.existingId ? { existing_id: event.existingId } : {})
        } as any).subscribe(() => {
            this.reloadDebrief(debrief.id)
            Toast.success($localize`:@@i18n.debrief.positiveAdded:Positive added`)
        })
    }

    removePositive(debrief: DebriefProjectDebrief, positive: DebriefPositive) {
        this.#service.destroyPositive(positive.id).subscribe(() => {
            this.reloadDebrief(debrief.id)
        })
    }

    setDebriefedUser(debrief: DebriefProjectDebrief, user: User | null) {
        debrief.debriefed_user = user || undefined
        debrief.debriefed_user_id = user?.id
        this.#service.updateDebrief(debrief.id, { debriefed_user_id: user?.id ?? undefined }).subscribe()
    }

    setRating(debrief: DebriefProjectDebrief, rating: number) {
        const newRating = debrief.rating === rating ? undefined : rating
        this.#service.updateDebrief(debrief.id, { rating: newRating }).subscribe(updated => {
            this.debriefs = this.debriefs.map(d => d.id === updated.id ? updated : d)
        })
    }

    markAsCompleted(debrief: DebriefProjectDebrief) {
        this.#service.updateDebrief(debrief.id, { status: 'completed' }).subscribe(updated => {
            this.debriefs = this.debriefs.map(d => d.id === updated.id ? updated : d)
            Toast.success($localize`:@@i18n.common.debriefCompleted:debrief completed`)
        })
    }

    deleteDebrief(debrief: DebriefProjectDebrief) {
        debrief.confirm().then(() => {
            this.#service.deleteDebrief(debrief.id).subscribe(() => {
                this.debriefs = this.debriefs.filter(d => d.id !== debrief.id)
            })
        })
    }

    reopenDebrief(debrief: DebriefProjectDebrief) {
        this.#service.updateDebrief(debrief.id, { status: 'draft' }).subscribe(updated => {
            this.debriefs = this.debriefs.map(d => d.id === updated.id ? updated : d)
            Toast.info($localize`:@@i18n.common.debriefReopened:debrief reopened`)
        })
    }

    getCategoryColor(categoryId: string): string {
        return this.categories.find(c => c.id === categoryId)?.color || '#888888'
    }

    getCategoryName(categoryId: string): string {
        return this.categories.find(c => c.id === categoryId)?.name || ''
    }

    getSeverityClass(severity: string): string {
        switch (severity) {
            case 'critical': return 'bg-red'
            case 'high': return 'bg-orange'
            case 'medium': return 'bg-cyan'
            case 'low': return 'bg-grey'
            default: return 'bg-grey'
        }
    }

    // ── Local AI ──

    runLocalAI(debrief: DebriefProjectDebrief) {
        const plugin = this.localAiPlugin
        if (!plugin) return

        const localAiEnc = this.#pluginFactory.getPluginEncryptionsOfType('local_ai')[0]
        const configuredModel = localAiEnc?.value?.model?.trim()
        const selectedModel = configuredModel || plugin.getDefaultModel()?.id

        this.aiLoadingMap[debrief.id] = true
        this.aiSuggestionsMap[debrief.id] = []

        const categoryNames = this.categories.map(c => c.name).join(', ')

        const problemLines = debrief.problems.map(p =>
            `- ${p.title} (category: ${this.getCategoryName(p.debrief_problem_category_id)}, severity: ${p.severity || 'medium'})`
        ).join('\n')

        const positiveLines = debrief.positives.map(p =>
            `- ${p.title}${p.category ? ` (category: ${p.category.name})` : ''}`
        ).join('\n')

        const prompt = `You are analyzing a project debrief. Based on the existing data, suggest additional problems and positives that could be added.

Available categories: ${categoryNames}

Summary notes: ${debrief.summary_notes || '(none)'}

Existing problems:
${problemLines || '(none)'}

Existing positives (what went well):
${positiveLines || '(none)'}

Respond with ONLY a JSON array of suggestions. Each item must have:
- "type": "problem" or "positive"
- "title": short descriptive title
- "category": one of the available categories (or omit if unsure)
- "severity": "low", "medium", "high", or "critical" (only for problems)

Do not output reasoning, analysis, XML tags, markdown, code fences, or any text before/after JSON.

Suggest 4-8 items that are NOT already listed. Return raw JSON only, no explanation.

Example format:
[{"type":"problem","title":"Unclear requirements","category":"Process","severity":"high"},{"type":"positive","title":"Good team communication","category":"Process"}]`

        plugin.generateText(prompt, selectedModel).subscribe({
            next: (text) => {
                this.aiLoadingMap[debrief.id] = false
                try {
                    const suggestions = this.#parseAiSuggestions(text)
                    this.aiSuggestionsMap[debrief.id] = suggestions
                    if (!suggestions.length) {
                        throw new Error('No suggestions parsed from AI response')
                    }
                } catch {
                    Toast.error($localize`:@@i18n.debrief.aiParseError:Could not parse AI response`)
                }
            },
            error: (err) => {
                this.aiLoadingMap[debrief.id] = false
                Toast.error(err?.message || $localize`:@@i18n.debrief.aiError:AI request failed`)
            }
        })
    }

    #parseAiSuggestions(text: string): AISuggestion[] {
        try {
            const parsed = JSON.parse(text.trim())
            if (!Array.isArray(parsed)) return []
            return parsed
                .filter(item => item && typeof item.title === 'string' && item.title.trim()
                    && (item.type === 'problem' || item.type === 'positive'))
                .map(item => {
                    const suggestion: AISuggestion = { type: item.type, title: item.title.trim() }
                    if (item.category?.trim()) suggestion.category = item.category.trim()
                    if (item.type === 'problem') {
                        const sev = item.severity?.toLowerCase()
                        suggestion.severity = (['low', 'medium', 'high', 'critical'].includes(sev) ? sev : 'medium') as Severity
                    }
                    return suggestion
                })
        } catch {
            return []
        }
    }

    applySuggestion(debrief: DebriefProjectDebrief, suggestion: AISuggestion) {
        const categoryId = suggestion.category
            ? this.categories.find(c => c.name.toLowerCase() === suggestion.category!.toLowerCase())?.id
            : undefined

        if (suggestion.type === 'problem') {
            this.#service.storeProblem({
                title: suggestion.title,
                debrief_problem_category_id: categoryId || this.categories[0]?.id
            }).subscribe(problem => {
                this.#service.attachProblem(debrief.id, problem.id, suggestion.severity || 'medium').subscribe(() => {
                    this.reloadDebrief(debrief.id)
                    this.removeSuggestion(debrief.id, suggestion)
                    Toast.success($localize`:@@i18n.debrief.problemCreated:Problem created and added`)
                })
            })
        } else {
            this.#service.storePositive(debrief.id, {
                title: suggestion.title,
                debrief_problem_category_id: categoryId || undefined
            }).subscribe(() => {
                this.reloadDebrief(debrief.id)
                this.removeSuggestion(debrief.id, suggestion)
                Toast.success($localize`:@@i18n.debrief.positiveAdded:Positive added`)
            })
        }
    }

    removeSuggestion(debriefId: string, suggestion: AISuggestion) {
        this.aiSuggestionsMap[debriefId] = (this.aiSuggestionsMap[debriefId] || []).filter(s => s !== suggestion)
    }
}
