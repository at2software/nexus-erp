import { Component, computed, inject, input } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ChartProgressComponent } from '@charts/chart-progress/chart-progress.component';
import { PermissionsDirective } from '@directives/permissions.directive';
import { GlobalService } from '@models/global.service';
import { Project } from '@models/project/project.model';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { InputModalService } from '@app/_modals/modal-input/modal-input.component';
import { MoneyPipe } from '../../../../pipes/money.pipe';
import { MILESTONE_STATES } from '@models/milestones/milestone-state.enum';
import { NgApexchartsModule } from 'ng-apexcharts';
import { Color } from '@constants/Color';
import { ChartOptionsMinimal, ChartOptionsPieLabels } from '@charts/ChartOptions';
import { deepMerge } from '@constants/deepMerge';
import { deepCopy } from '@constants/deepClone';
import { ProjectState } from '@models/project/project-state.model';

@Component({
    selector: 'project-info',
    templateUrl: './project-info.component.html',
    styleUrls: ['./project-info.component.scss'],
    standalone: true,
    imports: [PermissionsDirective, RouterModule, ChartProgressComponent, NgbTooltipModule, MoneyPipe, NgApexchartsModule, DecimalPipe, DatePipe]
})
export class ProjectInfoComponent {
    project = input.required<Project>()

    global = inject(GlobalService)
    inputModalService = inject(InputModalService)

    shouldShowBudgetChart = computed(() => {
        const p = this.project()
        return !p.is_time_based &&
               !p.is_internal &&
               (p.state.progress === ProjectState.ProgressRunning || p.state.progress === ProjectState.ProgressFinished) &&
               p.var?.workshares?.length > 0 &&
               p.worksharesTotal() > 0 &&
               (p.work_estimated ?? 0) > 0
    })

    budgetChart = computed(() => {
        if (!this.shouldShowBudgetChart()) return { options: null, wrapperStyle: {} }

        const p = this.project()
        const timePercentage = p.timePercentage()
        const dangerColor = Color.fromVar('danger').toHexString()
        const workShares = p.var.workshares || []

        const customPieLabels: any = deepCopy(ChartOptionsPieLabels)
        customPieLabels.donut.labels.total.label = ''
        customPieLabels.donut.labels.total.showAlways = true
        customPieLabels.donut.labels.total.formatter = () => `${(timePercentage * 100).toFixed(0)}%`
        customPieLabels.donut.labels.value.fontSize = '40px'
        customPieLabels.donut.labels.value.fontFamily = 'BrunoAce'
        customPieLabels.donut.labels.value.offsetY = 10

        const baseChart = {
            chart: { type: 'donut', height: 200 },
            colors: workShares.map((u: any) => u.color),
            labels: workShares.map((u: any) => u.name),
            series: workShares.map((u: any) => u.val),
            stroke: { colors: ['#000000'], width: 1 },
            tooltip: { y: { formatter: (val: number) => `${val.toFixed(1)}h` } }
        }

        if (timePercentage < 1) {
            return {
                options: deepMerge(deepCopy(ChartOptionsMinimal), {
                    ...baseChart,
                    series: [...baseChart.series, (p.work_estimated ?? 0) - p.hours_invested],
                    labels: [...baseChart.labels, 'remaining'],
                    colors: [...baseChart.colors, '#6c757d'],
                    plotOptions: { pie: deepMerge(customPieLabels, { donut: { size: '70%' } }) }
                }),
                wrapperStyle: {}
            }
        }

        customPieLabels.donut.labels.total.color = dangerColor
        const overBudgetPercentage = Math.min(timePercentage - 1, 1)

        return {
            options: deepMerge(deepCopy(ChartOptionsMinimal), {
                ...baseChart,
                plotOptions: { pie: deepMerge(customPieLabels, { donut: { size: '70%' }, customScale: 0.85 }) }
            }),
            wrapperStyle: {
                '--budget-over-percentage': `${overBudgetPercentage * 360}deg`,
                '--budget-danger-color': dangerColor
            }
        }
    })

    milestoneStates = computed(() => {
        const counts = this.project().milestone_state_counts
        if (!counts) return []
        return [
            { name: MILESTONE_STATES[2].name, count: counts.done,        color: 'var(--bs-success)', bgClass: 'bg-success'   },
            { name: MILESTONE_STATES[1].name, count: counts.in_progress, color: 'var(--bs-primary)', bgClass: 'bg-primary'   },
            { name: MILESTONE_STATES[0].name, count: counts.todo,        color: '#6c757d',            bgClass: 'bg-secondary' },
        ].filter(s => s.count > 0)
    })

    milestoneTotal = computed(() => this.project().milestone_state_counts?.total || 0)

    getMilestonePerc = (count: number) => this.milestoneTotal() > 0 ? (100 * count / this.milestoneTotal()) : 0

    getMilestoneStateTooltip(stateId: number) {
        const counts = this.project().milestone_state_counts
        if (!counts) return ''
        const countMap: Record<number, number> = { 0: counts.todo, 1: counts.in_progress, 2: counts.done }
        return `${MILESTONE_STATES[stateId]?.name || ''}: ${countMap[stateId] ?? 0}`
    }

    updateLeadProbability = () => {
        this.inputModalService.open($localize`:@@i18n.project.leadProbability:lead probability`).then(result => {
            if (result?.text) {
                const newValue = parseFloat(result.text) / 100
                if (!isNaN(newValue) && newValue >= 0 && newValue <= 1) {
                    const p = this.project()
                    p.lead_probability = newValue
                    p.update().subscribe()
                }
            }
        })
    }
}
