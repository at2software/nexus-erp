import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbPopoverModule } from '@ng-bootstrap/ng-bootstrap';
import { RouterModule } from '@angular/router';
import { User } from '@models/user/user.model';
import { UserService } from '@models/user/user.service';
import { dayjs } from '@constants/dates';
import { Milestone } from '@models/milestones/milestone.model';
import { Project } from '@models/project/project.model';
import { Nx } from '@app/nx/nx.directive';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { CompactItemDirective } from '@shards/ul-compact/CompactItemDirective';
import { UlCompactComponent } from '@shards/ul-compact/ul-compact.component';
import { tracked } from '@constants/tracked';
import { DailyWorkload, DailyWorkloadElement, WorkloadData } from '@models/api-response';

interface WeekColumn {
    weekNumber: number;
    monthLabel?: string;
    days: (DailyWorkload | null)[];
}

@Component({
    selector: 'hr-workload-heatmap',
    templateUrl: './hr-workload-heatmap.component.html',
    styleUrls: ['./hr-workload-heatmap.component.scss'],
    imports: [DecimalPipe, FormsModule, NgbPopoverModule, RouterModule, UlCompactComponent, CompactItemDirective, AvatarComponent, Nx, AvatarComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HrWorkloadHeatmapComponent {
    readonly user = input.required<User>();
    readonly trackedUser = tracked(this.user);

    #userService = inject(UserService);

    data = signal<WorkloadData | null>(null);
    weekColumns = signal<WeekColumn[]>([]);
    selectedDay = signal<DailyWorkload | null>(null);

    readonly dayLabels = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

    constructor() {
        effect(() => {
            if (this.user()) this.#loadData();
        });
    }

    #loadData(): void {
        const start = dayjs().startOf('day').format('YYYY-MM-DD');
        const end = dayjs().add(3, 'months').format('YYYY-MM-DD');

        this.#userService.showDailyWorkload(this.user(), start, end).subscribe((data: WorkloadData) => {
            const dailyWorkload: DailyWorkload[] = data.daily_workload.map((day) => ({
                ...day,
                elements: day.elements.map((el): DailyWorkloadElement => ({
                    ...el,
                    project: el.project ? Project.fromJson(el.project) : undefined,
                })),
            }));
            const unconfiguredMilestones = data.unconfigured_milestones.map((milestone) => Milestone.fromJson(milestone));
            const result: WorkloadData = { ...data, daily_workload: dailyWorkload, unconfigured_milestones: unconfiguredMilestones };
            this.data.set(result);
            this.weekColumns.set(this.#buildWeekColumns(result));
        });
    }

    #buildWeekColumns(data: WorkloadData): WeekColumn[] {
        const workloadMap = new Map<string, DailyWorkload>();
        data.daily_workload.forEach((day) => workloadMap.set(day.date, day));

        const startDate = dayjs(data.start_date);
        const endDate = dayjs(data.end_date);
        const weeks: WeekColumn[] = [];
        let currentWeekStart = startDate.startOf('isoWeek');
        let currentMonth = '';

        while (currentWeekStart.isSameOrBefore(endDate)) {
            const weekDays: (DailyWorkload | null)[] = [];
            const weekNumber = currentWeekStart.isoWeek();
            let monthLabel: string | undefined;

            for (let i = 0; i < 7; i++) {
                const day = currentWeekStart.add(i, 'days');
                const dayStr = day.format('YYYY-MM-DD');
                weekDays.push(day.isBefore(startDate) || day.isAfter(endDate) ? null : (workloadMap.get(dayStr) || null));

                if (i === 0) {
                    const monthName = day.format('MMM YYYY');
                    if (monthName !== currentMonth) {
                        monthLabel = day.format('MMM');
                        currentMonth = monthName;
                    }
                }
            }

            weeks.push({ weekNumber, monthLabel, days: weekDays });
            currentWeekStart = currentWeekStart.add(1, 'week');
        }

        return weeks;
    }

    getColorClass(day: DailyWorkload | null): string {
        if (!day) return 'workload-empty';
        if (day.is_break) return 'workload-break';
        const p = day.total_percent;
        if (p === 0) return 'workload-empty';
        if (p < 50) return 'workload-green';
        if (p < 75) return 'workload-yellow';
        if (p < 100) return 'workload-orange';
        if (p <= 150) return 'workload-red';
        return 'workload-purple';
    }

    isToday = (day: DailyWorkload | null): boolean => day?.date === dayjs().format('YYYY-MM-DD');
    formatDate = (dateStr: string): string => dayjs(dateStr).format('ddd, MMM D, YYYY');
    selectDay = (day: DailyWorkload | null): void => this.selectedDay.set(day);
    getProjectPath = (element: DailyWorkloadElement): string => element.project_id ? `/projects/${element.project_id}/milestones` : (element.project_path || '');

    trackByWeek = (_index: number, week: WeekColumn): number => week.weekNumber;
    trackByElement = (_index: number, element: DailyWorkloadElement): string => `${element.type}-${element.id}`;
}
