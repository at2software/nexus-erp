import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbPopoverModule } from '@ng-bootstrap/ng-bootstrap';
import { RouterModule } from '@angular/router';
import { User } from '@models/user/user.model';
import { UserService } from '@models/user/user.service';
import moment from 'moment';
import { Milestone } from '@models/milestones/milestone.model';
import { Project } from '@models/project/project.model';
import { Nx } from '@app/nx/nx.directive';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { CompactItemDirective } from '@shards/ul-compact/CompactItemDirective';
import { UlCompactComponent } from '@shards/ul-compact/ul-compact.component';
import { tracked } from '@constants/tracked';

interface DailyWorkloadElement {
    type: 'assignment' | 'milestone';
    id: string;
    name: string;
    hours: number;
    project_id?: string;
    project_path?: string;
    project?: Project;
    project_name?: string;
    workload_percent?: number;
}

interface DailyWorkload {
    date: string;
    day_of_week: number;
    total_percent: number;
    available_hours: number;
    assignment_hours: number;
    milestone_hours: number;
    total_hours: number;
    is_break: boolean;
    break_type?: string;
    break_name?: string;
    elements: DailyWorkloadElement[];
}

interface WorkloadData {
    user_id: string;
    start_date: string;
    end_date: string;
    hpw: number;
    hpw_array: number[];
    daily_workload: DailyWorkload[];
    unconfigured_milestones: Milestone[];
}

interface WeekColumn {
    weekNumber: number;
    monthLabel?: string;
    days: (DailyWorkload | null)[];
}

@Component({
    selector: 'hr-workload-heatmap',
    templateUrl: './hr-workload-heatmap.component.html',
    styleUrls: ['./hr-workload-heatmap.component.scss'],
    standalone: true,
    imports: [DecimalPipe, FormsModule, NgbPopoverModule, RouterModule, UlCompactComponent, CompactItemDirective, AvatarComponent, Nx, AvatarComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HrWorkloadHeatmapComponent {
    readonly userIn = input.required<User>({ alias: 'user' });
    readonly user = tracked(this.userIn);

    #userService = inject(UserService);

    data = signal<WorkloadData | null>(null);
    weekColumns = signal<WeekColumn[]>([]);
    selectedDay = signal<DailyWorkload | null>(null);

    readonly dayLabels = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

    constructor() {
        effect(() => {
            if (this.userIn()) this.#loadData();
        });
    }

    #loadData(): void {
        const start = moment().startOf('day').format('YYYY-MM-DD');
        const end = moment().add(3, 'months').format('YYYY-MM-DD');

        this.#userService.showDailyWorkload(this.userIn(), start, end).subscribe((data: any) => {
            data.daily_workload.forEach((day: any) => {
                day.elements = day.elements.map((el: any) => {
                    el.project = el.project ? Project.fromJson(el.project) : undefined;
                    return el;
                });
            });
            data.unconfigured_milestones = data.unconfigured_milestones.map((milestone: any) => {
                const n = Milestone.fromJson(milestone);
                n.var.project_name = milestone.project_name;
                return n;
            });
            this.data.set(data as WorkloadData);
            this.weekColumns.set(this.#buildWeekColumns(data as WorkloadData));
        });
    }

    #buildWeekColumns(data: WorkloadData): WeekColumn[] {
        const workloadMap = new Map<string, DailyWorkload>();
        data.daily_workload.forEach((day) => workloadMap.set(day.date, day));

        const startDate = moment(data.start_date);
        const endDate = moment(data.end_date);
        const weeks: WeekColumn[] = [];
        const currentWeekStart = startDate.clone().startOf('isoWeek');
        let currentMonth = '';

        while (currentWeekStart.isSameOrBefore(endDate)) {
            const weekDays: (DailyWorkload | null)[] = [];
            const weekNumber = currentWeekStart.isoWeek();
            let monthLabel: string | undefined;

            for (let i = 0; i < 7; i++) {
                const day = currentWeekStart.clone().add(i, 'days');
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
            currentWeekStart.add(1, 'week');
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

    isToday = (day: DailyWorkload | null): boolean => day?.date === moment().format('YYYY-MM-DD');
    formatDate = (dateStr: string): string => moment(dateStr).format('ddd, MMM D, YYYY');
    selectDay = (day: DailyWorkload | null): void => this.selectedDay.set(day);
    getProjectPath = (element: DailyWorkloadElement): string => element.project_id ? `/projects/${element.project_id}/milestones` : (element.project_path || '');

    trackByWeek = (_index: number, week: WeekColumn): number => week.weekNumber;
    trackByElement = (_index: number, element: DailyWorkloadElement): string => `${element.type}-${element.id}`;
}
