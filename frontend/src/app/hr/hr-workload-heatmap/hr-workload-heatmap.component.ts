import { Component, inject, input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbPopoverModule } from '@ng-bootstrap/ng-bootstrap';
import { RouterModule } from '@angular/router';
import { User } from 'src/models/user/user.model';
import { UserService } from 'src/models/user/user.service';
import moment from 'moment';
import { Milestone } from '@models/milestones/milestone.model';
import { UlCompactComponent } from '@shards/ul-compact/ul-compact.component';
import { Project } from '@models/project/project.model';
import { AvatarComponent } from "@shards/avatar/avatar.component";
import { NexusModule } from '@app/nx/nexus.module';

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
    imports: [CommonModule, FormsModule, NgbPopoverModule, RouterModule, UlCompactComponent, AvatarComponent, NexusModule]
})
export class HrWorkloadHeatmapComponent implements OnChanges {
    
    user = input.required<User>()

    #userService = inject(UserService);

    data: WorkloadData | null = null;
    weekColumns: WeekColumn[] = [];
    dayLabels = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
    selectedDay: DailyWorkload | null = null;

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['user'] && this.user()) {
            this.loadData();
        }
    }

    loadData(): void {
        const start = moment().startOf('day').format('YYYY-MM-DD');
        const end = moment().add(3, 'months').format('YYYY-MM-DD');

        this.#userService.showDailyWorkload(this.user(), start, end).subscribe((data:any) => {
            data.daily_workload.forEach((day:any) => {
                day.elements = day.elements.map((el:any) => {
                    el.project = el.project ? Project.fromJson(el.project) : undefined;
                    return el;
                });
            });
            data.unconfigured_milestones = data.unconfigured_milestones.map((milestone:any) => {
                const n = Milestone.fromJson(milestone)
                n.var.project_name = milestone.project_name
                return n;
            });
            this.data = data as WorkloadData;
            this.buildWeekColumns();
        });
    }

    buildWeekColumns(): void {
        if (!this.data) return;

        const workloadMap = new Map<string, DailyWorkload>();
        this.data.daily_workload.forEach(day => {
            workloadMap.set(day.date, day);
        });

        const startDate = moment(this.data.start_date);
        const endDate = moment(this.data.end_date);
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

                if (day.isBefore(startDate) || day.isAfter(endDate)) {
                    weekDays.push(null);
                } else {
                    weekDays.push(workloadMap.get(dayStr) || null);
                }

                if (i === 0) {
                    const monthName = day.format('MMM YYYY');
                    if (monthName !== currentMonth) {
                        monthLabel = day.format('MMM');
                        currentMonth = monthName;
                    }
                }
            }

            weeks.push({
                weekNumber,
                monthLabel,
                days: weekDays
            });

            currentWeekStart.add(1, 'week');
        }

        this.weekColumns = weeks;
    }

    getColorClass(day: DailyWorkload | null): string {
        if (!day) return 'workload-empty';
        if (day.is_break) return 'workload-break';

        const percent = day.total_percent;
        if (percent === 0) return 'workload-empty';
        if (percent < 50) return 'workload-green';
        if (percent < 75) return 'workload-yellow';
        if (percent < 100) return 'workload-orange';
        if (percent <= 150) return 'workload-red';
        return 'workload-purple';
    }

    isToday(day: DailyWorkload | null): boolean {
        if (!day) return false;
        return day.date === moment().format('YYYY-MM-DD');
    }

    formatDate(dateStr: string): string {
        return moment(dateStr).format('ddd, MMM D, YYYY');
    }

    selectDay(day: DailyWorkload | null): void {
        this.selectedDay = day;
    }

    getProjectPath(element: DailyWorkloadElement): string {
        if (element.project_id) {
            return `/projects/${element.project_id}/milestones`;
        }
        return element.project_path || '';
    }

    trackByWeek(_index: number, week: WeekColumn): number {
        return week.weekNumber;
    }

    trackByElement(_index: number, element: DailyWorkloadElement): string {
        return `${element.type}-${element.id}`;
    }

}
