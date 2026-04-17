import { Component, inject } from '@angular/core';
import { BaseWidgetComponent } from '../base.widget.component';
import { OptionType } from '../widget-options/widget-options.component';
import { WidgetsModule } from '../widgets.module';
import { Project } from 'src/models/project/project.model';
import { ProjectService } from 'src/models/project/project.service';
import { WidgetService } from '@models/widget.service';
import { Color } from '@constants/Color';
import { ChartOptionsMinimal, ChartOptionsPieLabels } from '@charts/ChartOptions';
import { deepMerge } from '@constants/deepMerge';
import { deepCopy } from '@constants/deepClone';
import { NgApexchartsModule } from 'ng-apexcharts';
import { ChartProgressComponent } from '@charts/chart-progress/chart-progress.component';
import { MILESTONE_STATES } from '@models/milestones/milestone-state.enum';
import { ProjectState } from '@models/project/project-state.model';

@Component({
    selector: 'widget-project-analysis',
    templateUrl: './widget-project-analysis.component.html',
    styleUrls: ['./widget-project-analysis.component.scss', './../base.widget.component.scss'],
    standalone: true,
    imports: [WidgetsModule, NgApexchartsModule, ChartProgressComponent]
})
export class WidgetProjectAnalysisComponent extends BaseWidgetComponent {

    project: Project | null = null
    runningProjects: Project[] = []
    budgetChartOptions: any = null
    budgetWrapperStyle: any = {}
    milestoneStates: any[] = []

    #projectService = inject(ProjectService)
    #widgetService = inject(WidgetService)

    defaultOptions = () => ({
        'project-id': { type: OptionType.String, value: '', i18n: $localize`:@@i18n.common.projectId:project ID` }
    })

    reload(): void {
        const projectId = this.getOptions()['project-id']?.value
        if (projectId) {
            this.#loadProject(projectId)
        } else {
            this.#loadRunningProjects()
        }
    }

    #loadProject(id: string): void {
        this.#projectService.show(id).subscribe((project: Project) => {
            this.#computeWorkshares(project)
            this.project = project
            this.budgetChartOptions = null
            this.milestoneStates = this.#computeMilestoneStates(project)
            if (this.#shouldShowBudgetChart()) {
                this.#buildBudgetChart()
            }
        })
    }

    #loadRunningProjects(): void {
        this.#widgetService.indexCashflow('PROJECTS', {}, Project).subscribe((response: any) => {
            this.runningProjects = response.objects || []
        })
    }

    selectProject(project: Project): void {
        const newOptions = { ...this.getOptions() }
        newOptions['project-id'] = { ...newOptions['project-id'], value: project.id.toString() }
        this._onUpdate(newOptions)
        this.#loadProject(project.id.toString())
    }

    #computeWorkshares(project: Project): void {
        project.var = project.var || {} as any
        project.var.workshares = (project.timeline_chart || []).map((_: any) => ({
            name: _.user?.name || 'Unknown',
            color: _.user?.color || '#cccccc',
            val: _.data.reduce((sum: number, d: any) => sum + (parseFloat(d.sum) || 0), 0)
        }))
    }

    #shouldShowBudgetChart(): boolean {
        if (!this.project) return false
        return !this.project.is_time_based &&
               !this.project.is_internal &&
               (this.project.state.progress === ProjectState.ProgressRunning || this.project.state.progress === ProjectState.ProgressFinished) &&
               this.project.var?.workshares?.length > 0 &&
               this.project.worksharesTotal() > 0 &&
               (this.project.work_estimated ?? 0) > 0
    }

    #buildBudgetChart(): void {
        const project = this.project!
        const timePercentage = project.timePercentage()
        const dangerColor = Color.fromVar('danger').toHexString()

        const buildPieLabels = () => {
            const labels: any = deepCopy(ChartOptionsPieLabels)
            labels.donut.labels.total.label = ''
            labels.donut.labels.total.showAlways = true
            labels.donut.labels.total.formatter = () => `${(timePercentage * 100).toFixed(0)}%`
            labels.donut.labels.value.fontSize = '40px'
            labels.donut.labels.value.fontFamily = 'BrunoAce'
            labels.donut.labels.value.offsetY = 10
            return labels
        }

        if (timePercentage < 1) {
            const workShares = project.var.workshares || []
            const pieLabels = buildPieLabels()
            this.budgetChartOptions = deepMerge(deepCopy(ChartOptionsMinimal), {
                series: [...workShares.map((u: any) => u.val), (project.work_estimated ?? 0) - project.hours_invested],
                labels: [...workShares.map((u: any) => u.name), 'remaining'],
                chart: { type: 'donut', height: 200 },
                colors: [...workShares.map((u: any) => u.color), '#6c757d'],
                stroke: { colors: ['#000000'], width: 1 },
                plotOptions: { pie: deepMerge(pieLabels, { donut: { size: '70%' } }) },
                tooltip: { y: { formatter: (val: number) => `${val.toFixed(1)}h` } }
            })
            this.budgetWrapperStyle = {}
        } else {
            const workShares = project.var.workshares || []
            const overBudgetPercentage = Math.min(timePercentage - 1, 1)
            const pieLabels = buildPieLabels()
            pieLabels.donut.labels.total.color = dangerColor
            this.budgetChartOptions = deepMerge(deepCopy(ChartOptionsMinimal), {
                series: workShares.map((u: any) => u.val),
                labels: workShares.map((u: any) => u.name),
                chart: { type: 'donut', height: 200 },
                colors: workShares.map((u: any) => u.color),
                stroke: { colors: ['#000000'], width: 1 },
                plotOptions: { pie: deepMerge(pieLabels, { donut: { size: '70%' }, customScale: 0.85 }) },
                tooltip: { y: { formatter: (val: number) => `${val.toFixed(1)}h` } }
            })
            this.budgetWrapperStyle = {
                '--budget-over-percentage': `${overBudgetPercentage * 360}deg`,
                '--budget-danger-color': dangerColor
            }
        }
    }

    #computeMilestoneStates(project: Project) {
        if (!project.milestone_state_counts) return []
        return [
            { name: MILESTONE_STATES[2].name, count: project.milestone_state_counts.done, color: 'var(--bs-success)' },
            { name: MILESTONE_STATES[1].name, count: project.milestone_state_counts.in_progress, color: 'var(--bs-primary)' },
            { name: MILESTONE_STATES[0].name, count: project.milestone_state_counts.todo, color: '#6c757d' },
        ].filter(s => s.count > 0)
    }

    getMilestoneTotal = () => this.project?.milestone_state_counts?.total || 0
    getMilestonePerc = (count: number) => this.getMilestoneTotal() > 0 ? (100 * count / this.getMilestoneTotal()) : 0
}
