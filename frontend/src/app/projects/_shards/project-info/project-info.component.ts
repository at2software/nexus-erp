import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ChartProgressComponent } from '@charts/chart-progress/chart-progress.component';
import { PermissionsDirective } from '@directives/permissions.directive';
import { GlobalService } from '@models/global.service';
import { Project } from '@models/project/project.model';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { InputModalService } from '@app/_modals/modal-input/modal-input.component';
import { MoneyPipe } from '@pipes/money.pipe';
import { MILESTONE_STATES } from '@models/milestones/milestone-state.enum';
import { EchartsComponent } from '@charts/echarts-wrapper/echarts-wrapper.component';
import { Color } from '@constants/Color';
import { ECHARTS_DEFAULT_TOOLTIP_OPTIONS, ECHARTS_DONUT_ITEM_STYLE } from '@charts/echarts-presets';
import { ProjectState } from '@models/project/project-state.model';
import { NComponent } from '@shards/n/n.component';
import { MlReliabilityDirective } from '@directives/ml-reliability.directive';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'project-info',
    templateUrl: './project-info.component.html',
    styleUrls: ['./project-info.component.scss'],
    imports: [PermissionsDirective, RouterModule, ChartProgressComponent, NgbTooltipModule, MoneyPipe, EchartsComponent, DecimalPipe, DatePipe, NComponent, MlReliabilityDirective],
})
export class ProjectInfoComponent {
    project = input.required<Project>();

    global = inject(GlobalService);
    inputModalService = inject(InputModalService);

    shouldShowBudgetChart = computed(() => {
        const p = this.project();
        return !p.is_time_based && !p.is_internal && (p.state.progress === ProjectState.ProgressRunning || p.state.progress === ProjectState.ProgressFinished) && p.var?.workshares?.length > 0 && p.worksharesTotal() > 0 && (p.work_estimated ?? 0) > 0;
    });

    budgetChart = computed(() => {
        if (!this.shouldShowBudgetChart()) return { options: null, wrapperStyle: {} };

        const p = this.project();
        const timePercentage = p.timePercentage();
        const dangerColor = Color.fromVar('danger').toHexString();
        const workShares = p.var.workshares || [];

        type WorkShare = { val: number; name: string; color: string };
        const baseData = (workShares as WorkShare[]).map((u) => ({
            value: u.val,
            name: u.name,
            itemStyle: { color: u.color, ...ECHARTS_DONUT_ITEM_STYLE },
        }));

        const pieData = timePercentage < 1 ? [...baseData, { value: (p.work_estimated ?? 0) - p.hours_invested, name: 'remaining', itemStyle: { color: '#6c757d', ...ECHARTS_DONUT_ITEM_STYLE } }] : baseData;

        const centerText = `${(timePercentage * 100).toFixed(0)}%`;
        const centerColor = timePercentage >= 1 ? dangerColor : '#ffffff';

        return {
            options: {
                chart: { height: 200 },
                backgroundColor: 'transparent',
                animation: false,
                tooltip: {
                    trigger: 'item',
                    ...ECHARTS_DEFAULT_TOOLTIP_OPTIONS,
                    formatter: (params: { name: string; value: number }) => `${params.name}: ${params.value.toFixed(1)}h`,
                },
                graphic: [{ type: 'text', left: 'center', top: 'center', style: { text: centerText, fill: centerColor, fontSize: 20, fontFamily: 'BrunoAce' } }],
                series: [
                    {
                        type: 'pie',
                        radius: ['35%', '70%'],
                        data: pieData,
                        label: { show: false },
                    },
                ],
            },
            wrapperStyle:
                timePercentage >= 1
                    ? {
                          '--budget-over-percentage': `${Math.min(timePercentage - 1, 1) * 360}deg`,
                          '--budget-danger-color': dangerColor,
                      }
                    : {},
        };
    });

    milestoneStates = computed(() => {
        const counts = this.project().milestone_state_counts;
        if (!counts) return [];
        return [
            { name: MILESTONE_STATES[2].name, count: counts.done, color: 'var(--bs-success)', bgClass: 'bg-success' },
            { name: MILESTONE_STATES[1].name, count: counts.in_progress, color: 'var(--bs-primary)', bgClass: 'bg-primary' },
            { name: MILESTONE_STATES[0].name, count: counts.todo, color: '#6c757d', bgClass: 'bg-secondary' },
        ].filter((s) => s.count > 0);
    });

    milestoneTotal = computed(() => this.project().milestone_state_counts?.total || 0);

    getMilestonePerc = (count: number) => (this.milestoneTotal() > 0 ? (100 * count) / this.milestoneTotal() : 0);

    getMilestoneStateTooltip(stateId: number) {
        const counts = this.project().milestone_state_counts;
        if (!counts) return '';
        const countMap: Record<number, number> = { 0: counts.todo, 1: counts.in_progress, 2: counts.done };
        return `${MILESTONE_STATES[stateId]?.name || ''}: ${countMap[stateId] ?? 0}`;
    }

    updateLeadProbability = () => {
        this.inputModalService.open($localize`:@@i18n.project.leadProbability:lead probability`).then((result) => {
            if (result?.text) {
                const newValue = parseFloat(result.text) / 100;
                if (!isNaN(newValue) && newValue >= 0 && newValue <= 1) {
                    const p = this.project();
                    p.lead_probability = newValue;
                    p.update().subscribe();
                }
            }
        });
    };
}
