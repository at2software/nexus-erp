import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { NgbPopover, NgbPopoverModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { CdkDropList, CdkDragDrop } from '@angular/cdk/drag-drop';
import { dayjs } from '@constants/date/dates';
import { Color } from '@constants/Color';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { Milestone } from '@models/milestone/milestone.model';
import { MilestoneState } from '@models/milestone/milestone-state.enum';
import { DailyWorkloadDto, DailyWorkloadElementDto, WorkloadDataDto } from '@models/_core/api-response';
import { Nx } from '@app/nx/nx.directive';

export interface MilestoneBar {
    milestone: Milestone;
    startCol: number; // 0..6 - first day column the bar occupies in this week
    span: number; // number of day columns the bar covers within this week
    lane: number; // vertical stacking lane to avoid overlap
    color: string;
    continuesLeft: boolean; // bar started in an earlier week
    continuesRight: boolean; // bar ends in a later week
}

export interface WeekRow {
    weekNumber: number;
    monthLabel?: string;
    days: (DailyWorkloadDto | null)[];
    bars: MilestoneBar[];
    laneCount: number;
    distinctProjectCount: number;
}

export interface CapacityCalendarDrop {
    date: string;
    item: unknown;
}

export interface MilestoneReschedule {
    milestone: Milestone;
    started_at: string;
    due_at: string;
}

type DragMode = 'move' | 'resize-start' | 'resize-end';
interface DragState {
    milestone: Milestone;
    mode: DragMode;
    dayDelta: number;
    weekDelta: number;
    originStart: ReturnType<typeof dayjs>;
    originDue: ReturnType<typeof dayjs>;
    pointerStartX: number;
    colWidth: number;
    rowTops: number[];
    startRowIndex: number;
}

const OVERFLOW_CAP_PERCENT = 150;

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'capacity-calendar',
    templateUrl: './capacity-calendar.component.html',
    styleUrls: ['./capacity-calendar.component.scss'],
    imports: [DecimalPipe, NgbPopoverModule, NgbTooltipModule, AvatarComponent, CdkDropList, Nx],
})
export class CapacityCalendarComponent {
    #elementRef = inject(ElementRef<HTMLElement>);

    workloadData = input.required<WorkloadDataDto>();
    milestones = input<Milestone[]>([]);

    itemDropped = output<CapacityCalendarDrop>();
    editMilestone = output<Milestone>();
    milestoneRescheduled = output<MilestoneReschedule>();
    addMilestoneForDay = output<string>();

    readonly dayLabels = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

    #drag = signal<DragState | null>(null);

    readonly weeks = computed<WeekRow[]>(() => this.#buildWeeks(this.workloadData(), this.milestones(), this.#drag()));

    readonly overdueMilestones = computed<Milestone[]>(() => {
        const startDate = dayjs(this.workloadData().start_date);
        return this.milestones().filter((m) => m.due_at && dayjs(m.due_at).isBefore(startDate, 'day') && this.isMilestoneOverdue(m));
    });

    dropListId = (day: DailyWorkloadDto): string => `capacity-day-${day.date}`;

    onDrop(day: DailyWorkloadDto, event: CdkDragDrop<DailyWorkloadDto>): void {
        this.itemDropped.emit({ date: day.date, item: event.item.data });
    }

    fillHeight = (day: DailyWorkloadDto): string => {
        if (day.available_hours <= 0) return '0%';
        const ratio = Math.min(day.total_hours / day.available_hours, OVERFLOW_CAP_PERCENT / 100);
        return `${ratio * 100}%`;
    };

    isOverflowing = (day: DailyWorkloadDto): boolean => day.total_percent > 100;

    isToday = (day: DailyWorkloadDto | null): boolean => day?.date === dayjs().format('YYYY-MM-DD');
    dayNumber = (day: DailyWorkloadDto): number => dayjs(day.date).date();
    fragmentationDots = (day: DailyWorkloadDto): number[] => Array.from({ length: Math.min(day.distinct_project_count, 5) });

    barLeft = (bar: MilestoneBar): string => `${(bar.startCol / 7) * 100}%`;
    barWidth = (bar: MilestoneBar): string => `${(bar.span / 7) * 100}%`;

    isMilestoneDone = (milestone: Milestone): boolean => milestone.state === MilestoneState.DONE;
    isMilestoneOverdue = (milestone: Milestone): boolean => !this.isMilestoneDone(milestone) && !!milestone.due_at && dayjs().isAfter(milestone.due_at, 'day');
    /** Still TODO although the planned start date has already passed. */
    isMilestoneLateStart = (milestone: Milestone): boolean =>
        milestone.state === MilestoneState.TODO && !this.isMilestoneOverdue(milestone) && !!milestone.started_at && dayjs().isAfter(milestone.started_at, 'day');
    /** TODO and its planned start date hasn't arrived yet. */
    isMilestoneNotStarted = (milestone: Milestone): boolean => milestone.state === MilestoneState.TODO && !this.isMilestoneLateStart(milestone) && !this.isMilestoneOverdue(milestone);

    milestoneTooltip = (milestone: Milestone): string => {
        if (this.isMilestoneOverdue(milestone)) return $localize`:@@i18n.planner.milestoneOverdue:${milestone.name} — overdue`;
        if (this.isMilestoneLateStart(milestone)) return $localize`:@@i18n.planner.milestoneLateStart:${milestone.name} — not started yet, planned start date has passed`;
        return milestone.name;
    };

    barTooltip = (bar: MilestoneBar): string => this.milestoneTooltip(bar.milestone);

    dueDateLabel = (milestone: Milestone): string => dayjs(milestone.due_at).format('MMM D');

    trackByWeek = (_index: number, week: WeekRow): number => week.weekNumber;
    trackByElement = (_index: number, element: DailyWorkloadElementDto): string => `${element.type}-${element.id}`;
    trackByBar = (_index: number, bar: MilestoneBar): string => bar.milestone.id;

    onAddClick(day: DailyWorkloadDto, popover: NgbPopover): void {
        popover.close();
        this.addMilestoneForDay.emit(day.date);
    }

    onBarClick(bar: MilestoneBar, event: MouseEvent): void {
        if (this.#suppressClick) {
            this.#suppressClick = false;
            return;
        }
        event.stopPropagation();
        this.editMilestone.emit(bar.milestone);
    }

    #suppressClick = false;

    onBarPointerDown(bar: MilestoneBar, mode: DragMode, event: PointerEvent): void {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        const weekRow = (event.target as HTMLElement).closest('.week-row') as HTMLElement | null;
        const weekBody = (event.target as HTMLElement).closest('.week-body') as HTMLElement | null;
        const colWidth = weekBody ? weekBody.clientWidth / 7 : 1;
        const rowEls = (this.#elementRef.nativeElement as HTMLElement).querySelectorAll('.week-row');
        const rowTops = Array.from(rowEls).map((el) => (el as HTMLElement).getBoundingClientRect().top);
        const startRowIndex = weekRow ? rowTops.findIndex((top) => Math.abs(top - weekRow.getBoundingClientRect().top) < 1) : -1;
        (event.target as HTMLElement).setPointerCapture?.(event.pointerId);

        this.#drag.set({
            milestone: bar.milestone,
            mode,
            dayDelta: 0,
            weekDelta: 0,
            originStart: dayjs(bar.milestone.started_at),
            originDue: dayjs(bar.milestone.due_at),
            pointerStartX: event.clientX,
            colWidth,
            rowTops,
            startRowIndex,
        });
    }

    onPointerMove(event: PointerEvent): void {
        const drag = this.#drag();
        if (!drag) return;
        const dayDelta = Math.round((event.clientX - drag.pointerStartX) / drag.colWidth);
        const weekDelta = drag.mode === 'move' && drag.startRowIndex !== -1 ? this.#rowIndexAt(drag.rowTops, event.clientY) - drag.startRowIndex : 0;
        if (dayDelta !== drag.dayDelta || weekDelta !== drag.weekDelta) this.#drag.set({ ...drag, dayDelta, weekDelta });
    }

    #rowIndexAt(rowTops: number[], clientY: number): number {
        let index = 0;
        for (let i = 0; i < rowTops.length; i++) {
            if (rowTops[i] <= clientY) index = i;
        }
        return index;
    }

    onPointerUp(): void {
        const drag = this.#drag();
        this.#drag.set(null);
        const totalDelta = drag ? drag.dayDelta + drag.weekDelta * 7 : 0;
        if (!drag || totalDelta === 0) return;

        const milestone = drag.milestone;

        let start = drag.originStart;
        let due = drag.originDue;
        if (drag.mode === 'move') {
            start = start.add(totalDelta, 'day');
            due = due.add(totalDelta, 'day');
        } else if (drag.mode === 'resize-start') {
            start = start.add(totalDelta, 'day');
            if (start.isAfter(due)) start = due;
        } else {
            due = due.add(totalDelta, 'day');
            if (due.isBefore(start)) due = start;
        }

        this.#suppressClick = true;
        this.milestoneRescheduled.emit({ milestone, started_at: start.format('YYYY-MM-DD'), due_at: due.format('YYYY-MM-DD') });
    }

    #buildWeeks(data: WorkloadDataDto, milestones: Milestone[], drag: DragState | null): WeekRow[] {
        const workloadMap = new Map<string, DailyWorkloadDto>();
        data.daily_workload.forEach((day) => workloadMap.set(day.date, day));

        const startDate = dayjs(data.start_date);
        const endDate = dayjs(data.end_date);
        const dated = milestones.filter((m) => m.started_at && m.due_at).map((m) => this.#withDragApplied(m, drag));

        const weeks: WeekRow[] = [];
        let currentWeekStart = startDate.startOf('isoWeek');
        let currentMonth = '';

        while (currentWeekStart.isSameOrBefore(endDate)) {
            const weekStart = currentWeekStart;
            const weekEnd = weekStart.add(6, 'days');
            const weekDays: (DailyWorkloadDto | null)[] = [];
            const weekNumber = weekStart.isoWeek();
            const weekProjectIds = new Set<string>();
            let monthLabel: string | undefined;

            for (let i = 0; i < 7; i++) {
                const day = weekStart.add(i, 'days');
                const dayStr = day.format('YYYY-MM-DD');
                const dayData = day.isBefore(startDate) || day.isAfter(endDate) ? null : (workloadMap.get(dayStr) ?? null);
                weekDays.push(dayData);
                dayData?.elements.forEach((el) => el.project_id && weekProjectIds.add(el.project_id));

                if (i === 0) {
                    const monthName = day.format('MMM YYYY');
                    if (monthName !== currentMonth) {
                        monthLabel = day.format('MMM');
                        currentMonth = monthName;
                    }
                }
            }

            const bars = this.#barsForWeek(dated, weekStart, weekEnd);
            const laneCount = bars.reduce((max, b) => Math.max(max, b.lane + 1), 0);
            weeks.push({ weekNumber, monthLabel, days: weekDays, bars, laneCount, distinctProjectCount: weekProjectIds.size });
            currentWeekStart = weekStart.add(1, 'week');
        }

        return weeks;
    }

    #withDragApplied(milestone: Milestone, drag: DragState | null): { milestone: Milestone; start: ReturnType<typeof dayjs>; due: ReturnType<typeof dayjs> } {
        let start = dayjs(milestone.started_at);
        let due = dayjs(milestone.due_at);
        const totalDelta = drag && drag.milestone.id === milestone.id ? drag.dayDelta + drag.weekDelta * 7 : 0;
        if (totalDelta !== 0 && drag) {
            if (drag.mode === 'move') {
                start = start.add(totalDelta, 'day');
                due = due.add(totalDelta, 'day');
            } else if (drag.mode === 'resize-start') {
                start = start.add(totalDelta, 'day');
                if (start.isAfter(due)) start = due;
            } else {
                due = due.add(totalDelta, 'day');
                if (due.isBefore(start)) due = start;
            }
        }
        return { milestone, start, due };
    }

    #barsForWeek(dated: { milestone: Milestone; start: ReturnType<typeof dayjs>; due: ReturnType<typeof dayjs> }[], weekStart: ReturnType<typeof dayjs>, weekEnd: ReturnType<typeof dayjs>): MilestoneBar[] {
        const segments = dated
            .filter(({ start, due }) => !due.isBefore(weekStart) && !start.isAfter(weekEnd))
            .map(({ milestone, start, due }) => {
                const segStart = start.isBefore(weekStart) ? weekStart : start;
                const segEnd = due.isAfter(weekEnd) ? weekEnd : due;
                return {
                    milestone,
                    startCol: segStart.diff(weekStart, 'day'),
                    span: Math.max(1, segEnd.diff(segStart, 'day') + 1),
                    color: this.#colorFor(milestone),
                    continuesLeft: start.isBefore(weekStart),
                    continuesRight: due.isAfter(weekEnd),
                };
            })
            .sort((a, b) => a.startCol - b.startCol || b.span - a.span);

        const laneEnds: number[] = [];
        return segments.map((seg) => {
            let lane = laneEnds.findIndex((end) => end < seg.startCol);
            if (lane === -1) {
                lane = laneEnds.length;
                laneEnds.push(0);
            }
            laneEnds[lane] = seg.startCol + seg.span - 1;
            return { ...seg, lane };
        });
    }

    #colorFor(milestone: Milestone): string {
        return milestone.project?.color() ?? Color.uniqueColorFromString(String(milestone.project_id ?? milestone.id));
    }
}
