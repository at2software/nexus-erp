import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnChanges } from '@angular/core';
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
    imports: [PermissionsDirective, CommonModule, RouterModule, ChartProgressComponent, NgbTooltipModule, MoneyPipe, NgApexchartsModule]
})
export class ProjectInfoComponent implements OnChanges {
    @Input() project: Project

    global = inject(GlobalService)
    inputModalService = inject(InputModalService)

    #cachedMilestoneStates: any[] | null = null
    budgetChartOptions: any = null
    budgetWrapperStyle: any = {}

    workSharesTotal = () => this.project.var.workshares.reduce((a: number, b: any) => a + b.val, 0)
    workSharesPerc = (u: any) => 100 * u.val / this.workSharesTotal()

    ngOnChanges() {
        if (this.project && this.shouldShowBudgetChart()) {
            this.buildBudgetChart()
        }
    }

    shouldShowBudgetChart(): boolean {
        return !this.project.is_time_based &&
               !this.project.is_internal &&
               (this.project.state.progress === ProjectState.ProgressRunning || this.project.state.progress === ProjectState.ProgressFinished) &&
               this.project.var?.workshares?.length > 0 &&
               this.workSharesTotal() > 0 &&
               (this.project.work_estimated ?? 0) > 0
    }

    getTimePercentage(): number {
        return this.project.hours_invested / (this.project.work_estimated ?? 1)
    }

    buildBudgetChart() {
        const timePercentage = this.getTimePercentage()
        const dangerColor = Color.fromVar('danger').toHexString()

        if (timePercentage < 1) {
            // Under budget: show work shares + remaining budget
            const workShares = this.project.var.workshares || []
            const series = [
                ...workShares.map((u: any) => u.val),
                (this.project.work_estimated ?? 0) - this.project.hours_invested
            ]
            const labels = [
                ...workShares.map((u: any) => u.name),
                'remaining'
            ]
            const colors = [
                ...workShares.map((u: any) => u.color),
                '#6c757d' // grey for remaining
            ]

            const customPieLabels: any = deepCopy(ChartOptionsPieLabels)
            customPieLabels.donut.labels.total.label = ''
            customPieLabels.donut.labels.total.showAlways = true
            customPieLabels.donut.labels.total.formatter = () => `${(timePercentage * 100).toFixed(0)}%`
            customPieLabels.donut.labels.value.fontSize = '40px'
            customPieLabels.donut.labels.value.fontFamily = 'BrunoAce'
            customPieLabels.donut.labels.value.offsetY = 10

            this.budgetChartOptions = deepMerge(deepCopy(ChartOptionsMinimal), {
                series,
                labels,
                chart: { type: 'donut', height: 200 },
                colors,
                stroke: { colors: ['#000000'], width: 1 },
                plotOptions: {
                    pie: deepMerge(customPieLabels, {
                        donut: { size: '70%' }
                    })
                },
                tooltip: {
                    y: {
                        formatter: (val: number) => `${val.toFixed(1)}h`
                    }
                }
            })

            // Reset wrapper style for under budget
            this.budgetWrapperStyle = {}
        } else {
            // Over budget: show work shares only + outer danger ring
            const workShares = this.project.var.workshares || []
            const overBudgetPercentage = Math.min(timePercentage - 1, 1) // Cap at 100% (200% total)

            const series = workShares.map((u: any) => u.val)
            const labels = workShares.map((u: any) => u.name)
            const colors = workShares.map((u: any) => u.color)

            const customPieLabels: any = deepCopy(ChartOptionsPieLabels)
            customPieLabels.donut.labels.total.label = ''
            customPieLabels.donut.labels.total.showAlways = true
            customPieLabels.donut.labels.total.formatter = () => `${(timePercentage * 100).toFixed(0)}%`
            customPieLabels.donut.labels.total.color = dangerColor
            customPieLabels.donut.labels.value.fontSize = '40px'
            customPieLabels.donut.labels.value.fontFamily = 'BrunoAce'
            customPieLabels.donut.labels.value.offsetY = 10

            this.budgetChartOptions = deepMerge(deepCopy(ChartOptionsMinimal), {
                series,
                labels,
                chart: { type: 'donut', height: 200 },
                colors,
                stroke: { colors: ['#000000'], width: 1 },
                plotOptions: {
                    pie: deepMerge(customPieLabels, {
                        donut: { size: '70%' },
                        customScale: 0.85
                    })
                },
                tooltip: {
                    y: {
                        formatter: (val: number) => `${val.toFixed(1)}h`
                    }
                }
            })

            // Set inline styles for danger ring
            this.budgetWrapperStyle = {
                '--budget-over-percentage': `${overBudgetPercentage * 360}deg`,
                '--budget-danger-color': dangerColor
            }
        }
    }

    // Milestone state methods
    getMilestoneStates() {
        if (!this.project.milestone_state_counts) return [];

        // Return cached states if they exist
        if (this.#cachedMilestoneStates) {
            return this.#cachedMilestoneStates;
        }

        this.#cachedMilestoneStates = [            
            {
                name: MILESTONE_STATES[2].name,
                count: this.project.milestone_state_counts.done,
                color: 'var(--bs-success)', // success for done
                bgClass: 'bg-success'
            },
            {
                name: MILESTONE_STATES[1].name,
                count: this.project.milestone_state_counts.in_progress,
                color: 'var(--bs-primary)', // primary for in_progress
                bgClass: 'bg-primary'
            },
            {
                name: MILESTONE_STATES[0].name,
                count: this.project.milestone_state_counts.todo,
                color: '#6c757d', // grey for todo
                bgClass: 'bg-secondary'
            },
        ];

        this.#cachedMilestoneStates = this.#cachedMilestoneStates.filter((state: any) => state.count > 0);
        return this.#cachedMilestoneStates;
    }

    getMilestoneTotal = () => this.project.milestone_state_counts?.total || 0
    getMilestonePerc = (count: number) => this.getMilestoneTotal() > 0 ? (100 * count / this.getMilestoneTotal()) : 0

    getMilestoneStateTooltip(stateId: number) {
        if (!this.project.milestone_state_counts) return '';

        const stateName = MILESTONE_STATES[stateId]?.name || '';
        let count = 0;

        switch (stateId) {
            case 0:
                count = this.project.milestone_state_counts.todo;
                break;
            case 1:
                count = this.project.milestone_state_counts.in_progress;
                break;
            case 2:
                count = this.project.milestone_state_counts.done;
                break;
        }

        return `${stateName}: ${count}`;
    }

    updateLeadProbability = () => {
        this.inputModalService.open($localize`:@@i18n.project.leadProbability:lead probability`).then(result => {
            if (result?.text) {
                const newValue = parseFloat(result.text) / 100
                if (!isNaN(newValue) && newValue >= 0 && newValue <= 1) {
                    this.project.lead_probability = newValue
                    this.project.update().subscribe()
                }
            }
        })
    }
}
