import { ChangeDetectionStrategy, Component, inject, signal, computed, effect } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbDropdownModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { NgxDaterangepickerMd } from 'ngx-daterangepicker-material';
import { DebriefService } from '@models/project/debrief.service';
import { DebriefStats, CategoryBreakdown, CategoryBreakdownPositives } from '@models/api-response';
import { Company } from '@models/company/company.model';
import { Project } from '@models/project/project.model';
import { DebriefProblemCategory } from '@models/project/debrief-problem-category.model';
import { DebriefProblem } from '@models/project/debrief-problem.model';
import { DebriefPositive } from '@models/project/debrief-positive.model';
import { DebriefRadarChartComponent } from '@app/projects/_shards/debrief-radar-chart/debrief-radar-chart.component';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { Nx } from '@app/nx/nx.directive';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { forkJoin } from 'rxjs';
import { dayjs, Dayjs } from '@constants/dates';
import { SpinnerComponent } from '@shards/spinner/spinner.component';
import { Dictionary } from '@constants/constants';
import { storageGet, storageSet } from '@constants/storage';

const STORAGE_KEY = 'debrief-dashboard-filters';

function readStoredFilter(key: string): string | null {
    return storageGet<Dictionary<string>>(STORAGE_KEY, {})[key] || null;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'projects-debriefing',
    imports: [FormsModule, RouterModule, NgbDropdownModule, NgbTooltipModule, NgxDaterangepickerMd, Nx, AvatarComponent, ToolbarComponent, DebriefRadarChartComponent, AvatarComponent, SpinnerComponent],
    templateUrl: './projects-debriefing.component.html',
    styleUrls: ['./projects-debriefing.component.scss'],
})
export class ProjectsDebriefingComponent {
    loading = signal(true);
    stats = signal<DebriefStats | null>(null);
    categories = signal<DebriefProblemCategory[]>([]);
    categoryBreakdown = signal<CategoryBreakdown[]>([]);
    categoryBreakdownPositives = signal<CategoryBreakdownPositives[]>([]);
    positivesRadarData = signal<CategoryBreakdown[]>([]);
    displayProblems = signal<DebriefProblem[]>([]);
    displayPositives = signal<DebriefPositive[]>([]);
    worstCustomers = signal<Company[]>([]);
    topCustomers = signal<Company[]>([]);
    expandedProblems = signal(new Set<string>());
    expandedPositives = signal(new Set<string>());

    // Initialized directly from localStorage so the effect only runs once on load
    selectedCategoryId = signal<string | null>(readStoredFilter('categoryId'));
    selectedSeverity = signal<string | null>(readStoredFilter('severity'));
    period: { startDate: Dayjs; endDate: Dayjs } = { startDate: dayjs().subtract(12, 'months'), endDate: dayjs() };

    selectedCategory = computed(() => this.categories().find(c => c.id === this.selectedCategoryId()));

    ranges = {
        'This year': [dayjs().startOf('year'), dayjs().endOf('year')],
        'Last year': [dayjs().subtract(1, 'year').startOf('year'), dayjs().subtract(1, 'year').endOf('year')],
        'Last 3 years': [dayjs().subtract(3, 'year'), dayjs()],
        All: [dayjs('2000-01-01'), dayjs()],
    } satisfies Dictionary<[Dayjs, Dayjs]>;

    #service = inject(DebriefService);

    constructor() {
        effect(() => {
            this.#saveFilters();
            this.loadData();
        });
    }

    loadData() {
        this.loading.set(true);
        const filters = this.buildFilters();

        forkJoin({
            categories: this.#service.indexCategories(),
            stats: this.#service.getStatsAggregated(filters),
            breakdown: this.#service.getStatsCategories(filters),
            breakdownPositives: this.#service.getStatsCategoriesPositives(filters),
            problems: this.#service.getStatsTopProblems(5, filters),
            positives: this.#service.getStatsTopPositives(50, filters),
            worstCustomers: this.#service.getStatsTopCustomers('worst', 10, filters),
            topCustomers: this.#service.getStatsTopCustomers('best', 10, filters),
        }).subscribe({
            next: (data) => {
                this.categories.set(data.categories || []);
                this.stats.set(data.stats || null);
                this.categoryBreakdown.set(data.breakdown || []);
                this.categoryBreakdownPositives.set(data.breakdownPositives || []);
                this.positivesRadarData.set(this.#buildPositivesRadar(data.breakdownPositives || []));
                this.#buildDisplayLists(data.positives || []);
                this.worstCustomers.set(data.worstCustomers || []);
                this.topCustomers.set(data.topCustomers || []);
                this.loading.set(false);
            },
            error: () => this.loading.set(false),
        });
    }

    buildFilters(): Dictionary {
        const filters: Dictionary = {};
        const catId = this.selectedCategoryId();
        const severity = this.selectedSeverity();
        if (catId) filters.category_id = catId;
        if (severity) filters.severity = severity;
        if (this.period?.startDate) filters.from_date = this.period.startDate.format('YYYY-MM-DD');
        if (this.period?.endDate) filters.to_date = this.period.endDate.format('YYYY-MM-DD');
        return filters;
    }

    toggleCategory(id: string | null) {
        this.selectedCategoryId.set(id);
    }

    toggleSeverity(severity: string | null) {
        this.selectedSeverity.set(severity);
    }

    clearFilters() {
        this.period = { startDate: dayjs().subtract(12, 'months'), endDate: dayjs() };
        this.selectedCategoryId.set(null);
        this.selectedSeverity.set(null);
    }

    onDateRangeChanged() {
        this.loadData();
    }

    toggleExpanded(id: string, target: 'problems' | 'positives') {
        const sig = target === 'problems' ? this.expandedProblems : this.expandedPositives;
        sig.update(s => {
            const next = new Set(s);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }

    getSeverityClass(severity: string): string {
        const map: Dictionary<string> = { critical: 'bg-red', high: 'bg-orange', medium: 'bg-cyan', low: 'bg-grey' };
        return map[severity] ?? 'bg-grey';
    }

    #buildDisplayLists(allPositives: DebriefPositive[]) {
        const catId = this.selectedCategoryId();
        const source = catId ? this.categoryBreakdown().filter(c => c.category_id === catId) : this.categoryBreakdown();

        this.displayProblems.set(source.flatMap(cat =>
            (cat.problems || []).map(p => {
                const problem = DebriefProblem.fromJson({ id: p.id, title: p.title, severity: p.severity, usage_count: p.usage_count });
                problem.category_color = cat.category_color;
                problem.category_name = cat.category_name;
                problem.var.projects = (p.projects || []).map((proj) => Project.fromJson(proj));
                return problem;
            }),
        ));

        this.displayPositives.set(allPositives);
    }

    #saveFilters() {
        const data: Dictionary<string> = {};
        const catId = this.selectedCategoryId();
        const severity = this.selectedSeverity();
        if (catId) data.categoryId = catId;
        if (severity) data.severity = severity;
        storageSet(STORAGE_KEY, data);
    }

    #buildPositivesRadar(positives: CategoryBreakdownPositives[]): CategoryBreakdown[] {
        const severities = ['low', 'medium', 'high', 'critical'] as const;
        return positives.map((cat, catIdx) => {
            const problems: { id: string; title: string; severity: string }[] = [];
            for (let i = 0; i < cat.total_positives; i++) {
                const seed = Math.sin((catIdx * 100 + i) * 9999) * 10000;
                const rand = seed - Math.floor(seed);
                problems.push({ id: `${catIdx}-${i}`, title: '', severity: severities[Math.floor(rand * 4)] });
            }
            return {
                category_id: cat.category_id,
                category_name: cat.category_name,
                category_color: cat.category_color,
                category_icon: cat.category_icon,
                total_problems: cat.total_positives,
                severity_counts: { low: 0, medium: 0, high: 0, critical: 0 },
                weighted_score: 0,
                problems,
            };
        });
    }
}
