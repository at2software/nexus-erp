import { ChangeDetectionStrategy, Component, inject, signal, computed, effect } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbDropdownModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { NgxDaterangepickerMd } from 'ngx-daterangepicker-material';
import { DebriefService, DebriefStats, CategoryBreakdown, CategoryBreakdownPositives } from '@models/project/debrief.service';
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
import moment from 'moment';
import { SpinnerComponent } from '@shards/spinner/spinner.component';

const STORAGE_KEY = 'debrief-dashboard-filters';

function readStoredFilter(key: string): string | null {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')[key] || null;
    } catch {
        return null;
    }
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'projects-debriefing',
    standalone: true,
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
    period: { startDate: any; endDate: any } = { startDate: moment().subtract(12, 'months'), endDate: moment() };

    selectedCategory = computed(() => this.categories().find(c => c.id === this.selectedCategoryId()));

    ranges: any = {
        'This year': [moment().startOf('year'), moment().endOf('year')],
        'Last year': [moment().subtract(1, 'year').startOf('year'), moment().subtract(1, 'year').endOf('year')],
        'Last 3 years': [moment().subtract(3, 'year'), moment()],
        All: [moment('2000-01-01'), moment()],
    };

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

    buildFilters(): any {
        const filters: any = {};
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
        this.period = { startDate: moment().subtract(12, 'months'), endDate: moment() };
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
        const map: Record<string, string> = { critical: 'bg-red', high: 'bg-orange', medium: 'bg-cyan', low: 'bg-grey' };
        return map[severity] ?? 'bg-grey';
    }

    #buildDisplayLists(allPositives: DebriefPositive[]) {
        const catId = this.selectedCategoryId();
        const source = catId ? this.categoryBreakdown().filter(c => c.category_id === catId) : this.categoryBreakdown();

        this.displayProblems.set(source.flatMap(cat =>
            (cat.problems || []).map(p => {
                const problem = DebriefProblem.fromJson({ id: p.id, title: p.title, severity: p.severity, usage_count: p.usage_count });
                problem.var.category_color = cat.category_color;
                problem.var.category_name = cat.category_name;
                problem.var.projects = (p.projects || []).map((proj: any) => Project.fromJson(proj));
                return problem;
            }),
        ));

        this.displayPositives.set(allPositives);
    }

    #saveFilters() {
        const data: any = {};
        const catId = this.selectedCategoryId();
        const severity = this.selectedSeverity();
        if (catId) data.categoryId = catId;
        if (severity) data.severity = severity;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
