import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Dictionary } from '@constants/constants';
import { BaseWidgetComponent } from '../base.widget.component';
import { OptionType } from '../widget-options/widget-options.component';
import { WIDGET_SHARED } from '../widgets.shared';
import { Project } from '@models/project/project.model';
import type { ProjectTimelineEntry } from '@models/api-response';
import { ProjectService } from '@models/project/project.service';
import { WidgetService } from '@models/widget.service';
import { Color } from '@constants/Color';
import { ECHARTS_DEFAULT_TOOLTIP_OPTIONS, ECHARTS_DONUT_ITEM_STYLE } from '@charts/echarts-presets';
import { ChartProgressComponent } from '@charts/chart-progress/chart-progress.component';
import { MILESTONE_STATES } from '@models/milestones/milestone-state.enum';
import { ProjectState } from '@models/project/project-state.model';
import type { EChartsOption } from 'echarts';
import type { TopLevelFormatterParams } from 'echarts/types/dist/shared';

interface WorkShare { name: string; color: string; val: number; }
interface MilestoneStateCount { name: string; count: number; color: string; }

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'widget-project-analysis',
    templateUrl: './widget-project-analysis.component.html',
    styleUrls: ['./widget-project-analysis.component.scss', './../base.widget.component.scss'],
    imports: [...WIDGET_SHARED, ChartProgressComponent],
})
export class WidgetProjectAnalysisComponent extends BaseWidgetComponent {
    project = signal<Project | null>(null);
    runningProjects = signal<Project[]>([]);
    budgetChartOptions = signal<EChartsOption | null>(null);
    budgetWrapperStyle = signal<Dictionary>({});
    milestoneStates = signal<MilestoneStateCount[]>([]);

    #projectService = inject(ProjectService);
    #widgetService = inject(WidgetService);

    defaultOptions = () => ({
        'project-id': { type: OptionType.String, value: '', i18n: $localize`:@@i18n.common.projectId:project ID` },
    });

    reload(): void {
        const projectId = this.getOptions()['project-id']?.value as string | undefined;
        if (projectId) this.#loadProject(projectId);
        else this.#loadRunningProjects();
    }

    #loadProject(id: string): void {
        this.#projectService.show(id).subscribe((project: Project) => {
            this.#computeWorkshares(project);
            this.project.set(project);
            this.budgetChartOptions.set(null);
            this.milestoneStates.set(this.#computeMilestoneStates(project));
            if (this.#shouldShowBudgetChart()) this.#buildBudgetChart();
        });
    }

    #loadRunningProjects(): void {
        this.#widgetService.indexCashflow('PROJECTS', {}, Project).subscribe((response) => {
            this.runningProjects.set(response.objects);
        });
    }

    selectProject(project: Project): void {
        const newOptions = { ...this.getOptions() };
        newOptions['project-id'] = { ...newOptions['project-id'], value: project.id.toString() };
        this._onUpdate(newOptions);
        this.#loadProject(project.id.toString());
    }

    #computeWorkshares(project: Project): void {
        project.var = project.var || ({} as Dictionary);
        project.var['workshares'] = (project.timeline_chart || []).map((_: ProjectTimelineEntry) => ({
            name: _.user?.name || 'Unknown',
            color: _.user?.color || '#cccccc',
            val: _.data.reduce((sum: number, d) => sum + (parseFloat(String(d.value)) || 0), 0),
        } as WorkShare));
    }

    #shouldShowBudgetChart(): boolean {
        const p = this.project();
        if (!p) return false;
        return !p.is_time_based && !p.is_internal &&
            (p.state.progress === ProjectState.ProgressRunning || p.state.progress === ProjectState.ProgressFinished) &&
            p.var?.workshares?.length > 0 && p.worksharesTotal() > 0 && (p.work_estimated ?? 0) > 0;
    }

    #buildBudgetChart(): void {
        const project = this.project()!;
        const timePercentage = project.timePercentage();
        const dangerColor = Color.fromVar('danger').toHexString();
        const workShares: WorkShare[] = project.var['workshares'] || [];
        const centerText = `${(timePercentage * 100).toFixed(0)}%`;
        const centerColor = timePercentage >= 1 ? dangerColor : '#ffffff';

        const pieData = timePercentage < 1
            ? [...workShares.map((u) => ({ value: u.val, name: u.name, itemStyle: { color: u.color, ...ECHARTS_DONUT_ITEM_STYLE } })), { value: (project.work_estimated ?? 0) - project.hours_invested, name: 'remaining', itemStyle: { color: '#6c757d', ...ECHARTS_DONUT_ITEM_STYLE } }]
            : workShares.map((u) => ({ value: u.val, name: u.name, itemStyle: { color: u.color, ...ECHARTS_DONUT_ITEM_STYLE } }));

        this.budgetChartOptions.set({
            backgroundColor: 'transparent',
            animation: false,
            tooltip: { trigger: 'item', ...ECHARTS_DEFAULT_TOOLTIP_OPTIONS, formatter: (params: TopLevelFormatterParams) => { const p = Array.isArray(params) ? params[0] : params; return `${p.name}: ${(p.value as number).toFixed(1)}h`; } },
            graphic: [{ type: 'text', left: 'center', top: 'center', style: { text: centerText, fill: centerColor, fontSize: 20, fontFamily: 'BrunoAce' } }],
            series: [{ type: 'pie', radius: ['35%', '70%'], data: pieData, label: { show: false } }],
        } satisfies EChartsOption);

        this.budgetWrapperStyle.set(timePercentage >= 1 ? {
            '--budget-over-percentage': `${Math.min(timePercentage - 1, 1) * 360}deg`,
            '--budget-danger-color': dangerColor,
        } : {});
    }

    #computeMilestoneStates(project: Project) {
        if (!project.milestone_state_counts) return [];
        return [
            { name: MILESTONE_STATES[2].name, count: project.milestone_state_counts.done, color: 'var(--bs-success)' },
            { name: MILESTONE_STATES[1].name, count: project.milestone_state_counts.in_progress, color: 'var(--bs-primary)' },
            { name: MILESTONE_STATES[0].name, count: project.milestone_state_counts.todo, color: '#6c757d' },
        ].filter((s) => s.count > 0);
    }

    getMilestoneTotal = () => this.project()?.milestone_state_counts?.total || 0;
    getMilestonePerc = (count: number) => this.getMilestoneTotal() > 0 ? (100 * count) / this.getMilestoneTotal() : 0;
}
