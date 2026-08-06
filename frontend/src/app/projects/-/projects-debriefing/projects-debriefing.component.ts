import { ChangeDetectionStrategy, Component, inject, signal, computed, effect } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbDropdownModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { NgxDaterangepickerMd } from 'ngx-daterangepicker-material';
import { DebriefService } from '@models/project/debrief.service';
import { CategoryBreakdownDto, CategoryBreakdownPositivesDto } from '@models/_core/api-response';
import { Project } from '@models/project/project.model';
import { DebriefProblem } from '@models/project/debrief-problem.model';
import { DebriefRadarChartComponent } from '@app/projects/_shards/debrief-radar-chart/debrief-radar-chart.component';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { Nx } from '@app/nx/nx.directive';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { modelListResource, modelResource } from '@models/http/model-resource';
import { dayjs, Dayjs } from '@constants/date/dates';
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
    expandedProblems = signal(new Set<string>());
    expandedPositives = signal(new Set<string>());

    selectedCategoryId = signal<string | null>(readStoredFilter('categoryId'));
    selectedSeverity = signal<string | null>(readStoredFilter('severity'));
    period = signal<{ startDate: Dayjs; endDate: Dayjs }>({ startDate: dayjs().subtract(12, 'months'), endDate: dayjs() });

    ranges = {
        'This year': [dayjs().startOf('year'), dayjs().endOf('year')],
        'Last year': [dayjs().subtract(1, 'year').startOf('year'), dayjs().subtract(1, 'year').endOf('year')],
        'Last 3 years': [dayjs().subtract(3, 'year'), dayjs()],
        All: [dayjs('2000-01-01'), dayjs()],
    } satisfies Dictionary<[Dayjs, Dayjs]>;

    #service = inject(DebriefService);

    readonly #filters = computed<Dictionary>(() => {
        const filters: Dictionary = {};
        const catId = this.selectedCategoryId();
        const severity = this.selectedSeverity();
        const period = this.period();
        if (catId) filters.category_id = catId;
        if (severity) filters.severity = severity;
        if (period?.startDate) filters.from_date = period.startDate.format('YYYY-MM-DD');
        if (period?.endDate) filters.to_date = period.endDate.format('YYYY-MM-DD');
        return filters;
    });

    readonly #categories = modelListResource(() => this.#service.indexCategories());
    readonly categories = this.#categories.value;
    readonly #stats = modelResource(this.#filters, (f) => this.#service.getStatsAggregated(f));
    readonly #breakdown = modelListResource(this.#filters, (f) => this.#service.getStatsCategories(f));
    readonly #breakdownPositives = modelListResource(this.#filters, (f) => this.#service.getStatsCategoriesPositives(f));
    readonly #positives = modelListResource(this.#filters, (f) => this.#service.getStatsTopPositives(50, f));
    readonly #worstCustomers = modelListResource(this.#filters, (f) => this.#service.getStatsTopCustomers('worst', 10, f));
    readonly #topCustomers = modelListResource(this.#filters, (f) => this.#service.getStatsTopCustomers('best', 10, f));

    readonly stats = this.#stats.value;
    readonly categoryBreakdown = this.#breakdown.value;
    readonly categoryBreakdownPositives = this.#breakdownPositives.value;
    readonly displayPositives = this.#positives.value;
    readonly worstCustomers = this.#worstCustomers.value;
    readonly topCustomers = this.#topCustomers.value;

    readonly loading = computed(() => this.#categories.isLoading() || this.#stats.isLoading() || this.#breakdown.isLoading() || this.#breakdownPositives.isLoading() || this.#positives.isLoading() || this.#worstCustomers.isLoading() || this.#topCustomers.isLoading());

    selectedCategory = computed(() => this.categories().find(c => c.id === this.selectedCategoryId()));
    readonly positivesRadarData = computed(() => this.#buildPositivesRadar(this.categoryBreakdownPositives()));
    readonly displayProblems = computed<DebriefProblem[]>(() => {
        const catId = this.selectedCategoryId();
        const source = catId ? this.categoryBreakdown().filter(c => c.category_id === catId) : this.categoryBreakdown();
        return source.flatMap(cat =>
            (cat.problems || []).map(p => {
                const problem = DebriefProblem.fromJson({ id: p.id, title: p.title, severity: p.severity, usage_count: p.usage_count });
                problem.category_color = cat.category_color;
                problem.category_name = cat.category_name;
                problem.var.projects = (p.projects || []).map((proj) => Project.fromJson(proj));
                return problem;
            }),
        );
    });

    constructor() {
        effect(() => this.#saveFilters());
    }

    toggleCategory(id: string | null) {
        this.selectedCategoryId.set(id);
    }

    toggleSeverity(severity: string | null) {
        this.selectedSeverity.set(severity);
    }

    clearFilters() {
        this.period.set({ startDate: dayjs().subtract(12, 'months'), endDate: dayjs() });
        this.selectedCategoryId.set(null);
        this.selectedSeverity.set(null);
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

    #saveFilters() {
        const data: Dictionary<string> = {};
        const catId = this.selectedCategoryId();
        const severity = this.selectedSeverity();
        if (catId) data.categoryId = catId;
        if (severity) data.severity = severity;
        storageSet(STORAGE_KEY, data);
    }

    #buildPositivesRadar(positives: CategoryBreakdownPositivesDto[]): CategoryBreakdownDto[] {
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
