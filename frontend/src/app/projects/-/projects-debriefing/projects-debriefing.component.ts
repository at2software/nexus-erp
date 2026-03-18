import { Component, OnInit, inject } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { RouterModule } from '@angular/router'
import { NgbDropdownModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap'
import { NgxDaterangepickerMd } from 'ngx-daterangepicker-material'
import { DebriefService, DebriefStats, CategoryBreakdown, CategoryBreakdownPositives } from '@models/project/debrief.service'
import { DebriefProblemCategory } from '@models/project/debrief-problem-category.model'
import { DebriefProblem } from '@models/project/debrief-problem.model'
import { DebriefPositive } from '@models/project/debrief-positive.model'
import { DebriefRadarChartComponent } from '@app/projects/_shards/debrief-radar-chart/debrief-radar-chart.component'
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component'
import { NexusModule } from '@app/nx/nexus.module'
import { forkJoin } from 'rxjs'
import moment from 'moment'

const STORAGE_KEY = 'debrief-dashboard-filters'

@Component({
    selector: 'projects-debriefing',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        NgbDropdownModule,
        NgbTooltipModule,
        NgxDaterangepickerMd,
        NexusModule,
        ToolbarComponent,
        DebriefRadarChartComponent
    ],
    templateUrl: './projects-debriefing.component.html',
    styleUrls: ['./projects-debriefing.component.scss']
})
export class ProjectsDebriefingComponent implements OnInit {
    loading = true
    stats: DebriefStats | null = null
    categories: DebriefProblemCategory[] = []
    categoryBreakdown: CategoryBreakdown[] = []
    categoryBreakdownPositives: CategoryBreakdownPositives[] = []
    positivesRadarData: CategoryBreakdown[] = []
    topProblems: DebriefProblem[] = []
    topPositives: DebriefPositive[] = []
    displayProblems: DebriefProblem[] = []
    displayPositives: DebriefPositive[] = []

    // Filters
    selectedCategoryId: string | null = null
    selectedSeverity: string | null = null
    period: { startDate: any, endDate: any } = { startDate: moment().subtract(12, 'months'), endDate: moment() }

    ranges: any = {
        'This year': [moment().startOf('year'), moment().endOf('year')],
        'Last year': [moment().subtract(1, 'year').startOf('year'), moment().subtract(1, 'year').endOf('year')],
        'Last 3 years': [moment().subtract(3, 'year'), moment()],
        'All': [moment('2000-01-01'), moment()]
    }

    #service = inject(DebriefService)

    ngOnInit() {
        this.#restoreFilters()
        this.loadData()
    }

    loadData() {
        this.loading = true
        const filters = this.buildFilters()

        forkJoin({
            categories: this.#service.indexCategories(),
            stats: this.#service.getStatsAggregated(filters),
            breakdown: this.#service.getStatsCategories(filters),
            breakdownPositives: this.#service.getStatsCategoriesPositives(filters),
            problems: this.#service.getStatsTopProblems(5, filters),
            positives: this.#service.getStatsTopPositives(50, filters),
        }).subscribe({
            next: (data) => {
                this.categories = data.categories || []
                this.stats = data.stats || null
                this.categoryBreakdown = data.breakdown || []
                this.categoryBreakdownPositives = data.breakdownPositives || []
                this.positivesRadarData = this.#buildPositivesRadar(this.categoryBreakdownPositives)
                this.#buildDisplayLists(data.positives || [])
                this.loading = false
            },
            error: () => this.loading = false
        })
    }

    buildFilters(): any {
        const filters: any = {}
        if (this.selectedCategoryId) filters.category_id = this.selectedCategoryId
        if (this.selectedSeverity) filters.severity = this.selectedSeverity
        if (this.period?.startDate) filters.from_date = this.period.startDate.format('YYYY-MM-DD')
        if (this.period?.endDate) filters.to_date = this.period.endDate.format('YYYY-MM-DD')
        return filters
    }

    get selectedCategory(): DebriefProblemCategory | undefined {
        return this.categories.find(c => c.id === this.selectedCategoryId)
    }

    toggleCategory(id: string | null) {
        this.selectedCategoryId = id
        this.applyFilters()
    }

    toggleSeverity(severity: string | null) {
        this.selectedSeverity = severity
        this.applyFilters()
    }

    applyFilters() {
        this.#saveFilters()
        this.loadData()
    }

    clearFilters() {
        this.selectedCategoryId = null
        this.selectedSeverity = null
        this.period = { startDate: moment().subtract(12, 'months'), endDate: moment() }
        this.#saveFilters()
        this.loadData()
    }

    onDateRangeChanged() {
        this.#saveFilters()
        this.loadData()
    }

    #buildDisplayLists(allPositives: DebriefPositive[]) {
        const source = this.selectedCategoryId
            ? this.categoryBreakdown.filter(c => c.category_id === this.selectedCategoryId)
            : this.categoryBreakdown

        this.displayProblems = source.flatMap(cat =>
            (cat.problems || []).map(p => {
                console.log(p)
                const problem = DebriefProblem.fromJson({ id: p.id, title: p.title, severity: p.severity, usage_count: p.usage_count, var: { category_color: cat.category_color, category_name: cat.category_name } })
                problem.var.category_color = cat.category_color
                return problem
            })
        )

        this.displayPositives = allPositives
    }

    #saveFilters() {
        const data: any = {}
        if (this.selectedCategoryId) data.categoryId = this.selectedCategoryId
        if (this.selectedSeverity) data.severity = this.selectedSeverity
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    }

    #restoreFilters() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (!stored) return
            const data = JSON.parse(stored)
            this.selectedCategoryId = data.categoryId || null
            this.selectedSeverity = data.severity || null
        } catch { }
    }

    #buildPositivesRadar(positives: CategoryBreakdownPositives[]): CategoryBreakdown[] {
        const severities = ['low', 'medium', 'high', 'critical'] as const
        return positives.map((cat, catIdx) => {
            const problems: { id: string, title: string, severity: string }[] = []
            for (let i = 0; i < cat.total_positives; i++) {
                const seed = Math.sin((catIdx * 100 + i) * 9999) * 10000
                const rand = seed - Math.floor(seed)
                problems.push({ id: `${catIdx}-${i}`, title: '', severity: severities[Math.floor(rand * 4)] })
            }
            return {
                category_id: cat.category_id,
                category_name: cat.category_name,
                category_color: cat.category_color,
                category_icon: cat.category_icon,
                total_problems: cat.total_positives,
                severity_counts: { low: 0, medium: 0, high: 0, critical: 0 },
                weighted_score: 0,
                problems
            }
        })
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
}
