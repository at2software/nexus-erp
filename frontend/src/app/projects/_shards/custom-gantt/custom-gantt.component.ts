import { Component, Input, ElementRef, ViewChild, OnInit, OnChanges, SimpleChanges, AfterViewInit, Output, EventEmitter, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NgbDropdown, NgbDropdownModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { Milestone } from '@models/milestones/milestone.model';
import { Project } from '@models/project/project.model';
import { User } from '@models/user/user.model';
import { UserService } from '@models/user/user.service';
import { NxService } from '@app/nx/nx.service';
import { NexusModule } from '@app/nx/nexus.module';
import { MilestoneService } from '@models/milestones/milestone.service';
import { Toast } from '@shards/toast/toast';
import { environment } from 'src/environments/environment';
import { Color } from '@constants/Color';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';

export interface GanttRow {
    type: 'header' | 'milestone' | 'task';
    data: any;
    project?: Project;
    milestone?: Milestone;
}

interface TimelineUnit {
    date: Date;
    x: number;
    label: string;
    isWeekend?: boolean;
    weekNumber?: number;
    workloadPercent?: number;
}

interface DailyWorkload {
    date: string;
    total_percent: number;
    is_break: boolean;
}

interface TimelineGroup {
    label: string;
    x: number;
    width: number;
    workloadPercent?: number;
}

interface RenderedMilestone {
    milestone: Milestone;
    x: number;
    width: number;
    y: number;
    rowIndex: number;
}

interface Dependency {
    from: Milestone;
    to: Milestone;
}

@Component({
    selector: 'custom-gantt',
    templateUrl: './custom-gantt.component.html',
    styleUrls: ['./custom-gantt.component.scss'],
    standalone: true,
    imports: [CommonModule, NgbDropdownModule, NexusModule, NgbTooltipModule, ToolbarComponent],
    host: { class: 'custom-gantt-host' }
})
export class CustomGanttComponent implements OnInit, AfterViewInit, OnChanges {
    @Input() rows: GanttRow[] = [];
    @Input() viewMode: string = 'Week';
    @Input() milestoneProjectMap?: Map<string, Project>;
    @Input() showProjectHeaders: boolean = true;
    @Input() workloadUser?: User;

    @Output() addMilestone = new EventEmitter<Project>();
    @Output() addTask = new EventEmitter<Project>();

    @ViewChild('svgContainer', { static: true }) svgContainer!: ElementRef<SVGSVGElement>;

    #elementRef = inject(ElementRef);

    // Expose Math for template
    readonly Math = Math;

    readonly HEADER_ROW_HEIGHT = 22;
    readonly MILESTONE_ROW_HEIGHT = 48;
    readonly TASK_HEIGHT = 20;
    readonly TIMELINE_HEADER_HEIGHT = 60;
    readonly GRID_COLOR = '#333';

    get UNIT_WIDTH(): number {
        return { 'Day': 40, 'Week': 80, 'Month': 120, 'Year': 200 }[this.viewMode] || 40;
    }

    timelineStart = new Date();
    timelineEnd = new Date();
    timelineUnits: TimelineUnit[] = [];
    timelineGroups: TimelineGroup[] = [];
    renderedMilestones: RenderedMilestone[] = [];
    dependencies: Dependency[] = [];

    svgWidth = 0;
    svgHeight = 0;
    scrollY = 0;
    xOffset = 0; // Offset to fix negative x coordinates when extending left

    draggingMilestone: Milestone | null = null;
    dragStartX = 0;
    dragStartDate: Date | null = null;
    dragDuration = 0;
    dragOriginalDates = new Map<string, { start: Date, end: Date | null }>();
    resizingMilestone: Milestone | null = null;
    resizingSide: 'left' | 'right' | null = null;
    resizeStartDate: Date | null = null;
    resizeEndDate: Date | null = null;
    hasMoved = false;
    clickedMilestone: Milestone | null = null;

    // Area selection state
    areaSelecting = false;
    areaSelectStart = { x: 0, y: 0 };
    areaSelectEnd = { x: 0, y: 0 };

    // Dependency drawing state
    drawingDependency: boolean = false;
    dependencyFromMilestone: Milestone | null = null;

    // Viewport tracking for off-screen indicators
    viewportLeft = 0;
    viewportRight = 0;
    dependencyToMilestone: Milestone | null = null;
    dependencyMouseX: number = 0;
    dependencyMouseY: number = 0;
    dependencyDrawingPath: string = '';
    dependencyHasMoved: boolean = false;

    // Task completion state
    completingTasks = new Set<string>();
    disappearingTasks = new Set<string>();

    hideCompleted = false;

    // Cached today position
    #cachedTodayX = 0;

    #router = inject(Router);
    #nxService = inject(NxService);
    #milestoneService = inject(MilestoneService);
    #userService = inject(UserService);

    workloadMap = new Map<string, DailyWorkload>();

    get visibleRows(): GanttRow[] {
        // Always filter out completed tasks first
        const filtered = this.rows.filter(row => {
            if (row.type === 'task' && row.data.state === 1) {
                return false;
            }
            return true;
        });

        if (!this.hideCompleted) return filtered;

        // Get project IDs that have at least one non-completed milestone
        const projectsWithVisibleMilestones = new Set<string>();
        filtered.forEach(row => {
            if (row.type === 'milestone') {
                const milestone = row.data as Milestone;
                if (milestone.state !== 2) {
                    projectsWithVisibleMilestones.add(String(milestone.project_id));
                }
            }
        });

        return filtered.filter(row => {
            if (row.type === 'milestone') {
                const milestone = row.data as Milestone;
                return milestone.state !== 2;
            }
            if (row.type === 'header') {
                // Hide header if all its milestones are completed
                return row.project && projectsWithVisibleMilestones.has(String(row.project.id));
            }
            // Keep tasks if their parent milestone is visible
            if (row.type === 'task' && row.milestone) {
                return row.milestone.state !== 2;
            }
            return true;
        });
    }

    loadWorkloadData() {
        if (!this.workloadUser) return;

        const start = new Date(this.timelineStart);
        start.setMonth(start.getMonth() - 1);
        const end = new Date(this.timelineEnd);
        end.setMonth(end.getMonth() + 1);

        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];

        this.#userService.showDailyWorkload(this.workloadUser, startStr, endStr).subscribe((data: any) => {
            this.workloadMap.clear();
            if (data.daily_workload) {
                data.daily_workload.forEach((day: DailyWorkload) => {
                    this.workloadMap.set(day.date, day);
                });
            }
            this.applyWorkloadToTimeline();
        });
    }

    applyWorkloadToTimeline() {
        this.timelineUnits.forEach(unit => {
            unit.workloadPercent = this.getWorkloadForUnit(unit);
        });

        this.timelineGroups.forEach(group => {
            group.workloadPercent = this.getWorkloadForGroup(group);
        });
    }

    getWorkloadForUnit(unit: TimelineUnit): number {
        switch (this.viewMode) {
            case 'Day': {
                const dateStr = unit.date.toISOString().split('T')[0];
                const workload = this.workloadMap.get(dateStr);
                return workload?.is_break ? -1 : (workload?.total_percent ?? 0);
            }
            case 'Week': {
                return this.getAverageWorkloadForDateRange(unit.date, 7);
            }
            case 'Month': {
                const daysInMonth = new Date(unit.date.getFullYear(), unit.date.getMonth() + 1, 0).getDate();
                return this.getAverageWorkloadForDateRange(unit.date, daysInMonth);
            }
            case 'Year': {
                const startOfYear = new Date(unit.date.getFullYear(), 0, 1);
                return this.getAverageWorkloadForDateRange(startOfYear, 365);
            }
            default:
                return 0;
        }
    }

    getWorkloadForGroup(group: TimelineGroup): number {
        const unitsInGroup = this.timelineUnits.filter(unit => {
            return unit.x >= group.x && unit.x < group.x + group.width;
        });

        if (unitsInGroup.length === 0) return 0;

        const validUnits = unitsInGroup.filter(u => (u.workloadPercent ?? 0) >= 0);
        if (validUnits.length === 0) return 0;

        const sum = validUnits.reduce((acc, u) => acc + (u.workloadPercent ?? 0), 0);
        return sum / validUnits.length;
    }

    getAverageWorkloadForDateRange(startDate: Date, days: number): number {
        let totalPercent = 0;
        let validDays = 0;

        for (let i = 0; i < days; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            const workload = this.workloadMap.get(dateStr);

            if (workload && !workload.is_break) {
                totalPercent += workload.total_percent;
                validDays++;
            }
        }

        return validDays > 0 ? totalPercent / validDays : 0;
    }

    getWorkloadColor(percent: number | undefined): string {
        if (percent === undefined || percent < 0) return 'transparent';
        if (percent === 0) return 'transparent';
        if (percent < 50) return '#2e8b57';
        if (percent < 75) return '#ffd700';
        if (percent < 100) return '#ff8c00';
        if (percent <= 150) return '#dc3545';
        return '#9b59b6';
    }

    ngOnInit() {
        this.calculateTimeline();
        if (this.workloadUser) {
            this.loadWorkloadData();
        }
    }

    ngAfterViewInit() {
        this.render();
        this.updateViewportBounds();
        // Force reflow to trigger sticky positioning on the host element
        setTimeout(() => {
            const hostElement = this.#elementRef.nativeElement;
            const currentScroll = hostElement.scrollLeft;
            hostElement.scrollLeft = currentScroll + 1;
            hostElement.scrollLeft = currentScroll;
            this.updateViewportBounds();
            this.scrollToCurrentDate();
        }, 100);
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['rows'] || changes['viewMode']) {
            this.calculateTimeline();
            this.render();
            if (changes['viewMode'] && !changes['viewMode'].firstChange) {
                setTimeout(() => this.scrollToCurrentDate(), 100);
            }
        }
        if (changes['workloadUser'] && this.workloadUser) {
            this.loadWorkloadData();
        }
    }

    calculateTimeline() {
        let minDate: Date | null = null;
        let maxDate: Date | null = null;

        this.rows.forEach(row => {
            if (row.type === 'milestone') {
                const milestone = row.data as Milestone;
                const startDate = milestone.started_at ? new Date(milestone.started_at) : null;
                const endDate = milestone.due_at ? new Date(milestone.due_at) : null;

                if (startDate) {
                    if (!minDate || startDate < minDate) minDate = startDate;
                    if (!maxDate || startDate > maxDate) maxDate = startDate;
                }
                if (endDate) {
                    if (!minDate || endDate < minDate) minDate = endDate;
                    if (!maxDate || endDate > maxDate) maxDate = endDate;
                }
            }
        });

        if (!minDate || !maxDate) {
            minDate = new Date();
            minDate.setDate(1);
            maxDate = new Date();
            maxDate.setMonth(maxDate.getMonth() + 3);
        }

        this.timelineStart = new Date(minDate);
        this.timelineStart.setDate(this.timelineStart.getDate() - 2);

        this.timelineEnd = new Date(maxDate);
        this.timelineEnd.setDate(this.timelineEnd.getDate() + 2);

        this.xOffset = 0; // Reset offset when recalculating timeline

        this.generateTimeline();
    }

    getWeekNumber(date: Date): number {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    }

    generateTimeline() {
        this.timelineUnits = [];
        this.timelineGroups = [];

        switch (this.viewMode) {
            case 'Day':
                this.generateDayTimeline();
                break;
            case 'Week':
                this.generateWeekTimeline();
                break;
            case 'Month':
                this.generateMonthTimeline();
                break;
            case 'Year':
                this.generateYearTimeline();
                break;
            default:
                this.generateDayTimeline();
        }

        this.extendTimelineToFillWidth();
        this.#cachedTodayX = this.#calculateTodayX();
    }

    extendTimelineToFillWidth() {
        const containerWidth = this.#elementRef.nativeElement.offsetWidth || window.innerWidth;

        if (this.svgWidth >= containerWidth) {
            this.applyWorkloadToTimeline();
            return;
        }

        const unitsNeeded = Math.ceil((containerWidth - this.svgWidth) / this.UNIT_WIDTH);
        const leftUnits = Math.floor(unitsNeeded / 2);
        const rightUnits = Math.ceil(unitsNeeded / 2);

        switch (this.viewMode) {
            case 'Day':
                this.extendDayTimeline(leftUnits, rightUnits);
                break;
            case 'Week':
                this.extendWeekTimeline(leftUnits, rightUnits);
                break;
            case 'Month':
                this.extendMonthTimeline(leftUnits, rightUnits);
                break;
            case 'Year':
                this.extendYearTimeline(leftUnits, rightUnits);
                break;
        }

        this.applyWorkloadToTimeline();
    }

    extendDayTimeline(leftUnits: number, rightUnits: number) {
        const leftOffset = leftUnits * this.UNIT_WIDTH;

        // Shift all existing units to the right
        this.timelineUnits.forEach(unit => unit.x += leftOffset);

        // Extend left
        const firstDate = new Date(this.timelineUnits[0].date);
        for (let i = leftUnits; i > 0; i--) {
            const newDate = new Date(firstDate);
            newDate.setDate(newDate.getDate() - i);
            this.timelineUnits.unshift({
                date: newDate,
                x: (leftUnits - i) * this.UNIT_WIDTH,
                label: newDate.getDate().toString(),
                isWeekend: newDate.getDay() === 0 || newDate.getDay() === 6
            });
        }

        // Extend right
        const lastDate = new Date(this.timelineUnits[this.timelineUnits.length - 1].date);
        const lastX = this.timelineUnits[this.timelineUnits.length - 1].x;
        for (let i = 1; i <= rightUnits; i++) {
            const newDate = new Date(lastDate);
            newDate.setDate(newDate.getDate() + i);
            this.timelineUnits.push({
                date: newDate,
                x: lastX + i * this.UNIT_WIDTH,
                label: newDate.getDate().toString(),
                isWeekend: newDate.getDay() === 0 || newDate.getDay() === 6
            });
        }

        this.svgWidth += (leftUnits + rightUnits) * this.UNIT_WIDTH;
        this.xOffset += leftOffset;
    }

    extendWeekTimeline(leftUnits: number, rightUnits: number) {
        const leftOffset = leftUnits * this.UNIT_WIDTH;

        // Shift all existing units to the right
        this.timelineUnits.forEach(unit => unit.x += leftOffset);

        // Extend left
        const firstDate = new Date(this.timelineUnits[0].date);
        for (let i = leftUnits; i > 0; i--) {
            const newDate = new Date(firstDate);
            newDate.setDate(newDate.getDate() - (i * 7));
            this.timelineUnits.unshift({
                date: newDate,
                x: (leftUnits - i) * this.UNIT_WIDTH,
                label: `CW ${this.getWeekNumber(newDate)}`,
                weekNumber: this.getWeekNumber(newDate)
            });
        }

        // Extend right
        const lastDate = new Date(this.timelineUnits[this.timelineUnits.length - 1].date);
        const lastX = this.timelineUnits[this.timelineUnits.length - 1].x;
        for (let i = 1; i <= rightUnits; i++) {
            const newDate = new Date(lastDate);
            newDate.setDate(newDate.getDate() + (i * 7));
            this.timelineUnits.push({
                date: newDate,
                x: lastX + i * this.UNIT_WIDTH,
                label: `CW ${this.getWeekNumber(newDate)}`,
                weekNumber: this.getWeekNumber(newDate)
            });
        }

        this.svgWidth += (leftUnits + rightUnits) * this.UNIT_WIDTH;
        this.xOffset += leftOffset;
        this.rebuildTimelineGroups();
    }

    extendMonthTimeline(leftUnits: number, rightUnits: number) {
        const leftOffset = leftUnits * this.UNIT_WIDTH;

        // Shift all existing units to the right
        this.timelineUnits.forEach(unit => unit.x += leftOffset);

        // Extend left
        const firstDate = new Date(this.timelineUnits[0].date);
        for (let i = leftUnits; i > 0; i--) {
            const newDate = new Date(firstDate);
            newDate.setMonth(newDate.getMonth() - i);
            this.timelineUnits.unshift({
                date: newDate,
                x: (leftUnits - i) * this.UNIT_WIDTH,
                label: newDate.toLocaleDateString('en', { month: 'short' })
            });
        }

        // Extend right
        const lastDate = new Date(this.timelineUnits[this.timelineUnits.length - 1].date);
        const lastX = this.timelineUnits[this.timelineUnits.length - 1].x;
        for (let i = 1; i <= rightUnits; i++) {
            const newDate = new Date(lastDate);
            newDate.setMonth(newDate.getMonth() + i);
            this.timelineUnits.push({
                date: newDate,
                x: lastX + i * this.UNIT_WIDTH,
                label: newDate.toLocaleDateString('en', { month: 'short' })
            });
        }

        this.svgWidth += (leftUnits + rightUnits) * this.UNIT_WIDTH;
        this.xOffset += leftOffset;
        this.rebuildTimelineGroups();
    }

    rebuildTimelineGroups() {
        this.timelineGroups = [];
        let currentYear = -1;
        let yearStart = 0;

        this.timelineUnits.forEach((unit) => {
            const year = unit.date.getFullYear();

            if (year !== currentYear) {
                if (currentYear !== -1 && this.timelineGroups.length > 0) {
                    this.timelineGroups[this.timelineGroups.length - 1].width = unit.x - yearStart;
                }
                currentYear = year;
                yearStart = unit.x;
                this.timelineGroups.push({ label: year.toString(), x: yearStart, width: 0 });
            }
        });

        if (this.timelineGroups.length > 0) {
            const lastUnit = this.timelineUnits[this.timelineUnits.length - 1];
            this.timelineGroups[this.timelineGroups.length - 1].width =
                (lastUnit.x + this.UNIT_WIDTH) - this.timelineGroups[this.timelineGroups.length - 1].x;
        }
    }

    extendYearTimeline(leftUnits: number, rightUnits: number) {
        const leftOffset = leftUnits * this.UNIT_WIDTH;

        // Shift all existing units to the right
        this.timelineUnits.forEach(unit => unit.x += leftOffset);

        // Extend left
        const firstDate = new Date(this.timelineUnits[0].date);
        for (let i = leftUnits; i > 0; i--) {
            const newDate = new Date(firstDate);
            newDate.setFullYear(newDate.getFullYear() - i);
            this.timelineUnits.unshift({
                date: newDate,
                x: (leftUnits - i) * this.UNIT_WIDTH,
                label: newDate.getFullYear().toString()
            });
        }

        // Extend right
        const lastDate = new Date(this.timelineUnits[this.timelineUnits.length - 1].date);
        const lastX = this.timelineUnits[this.timelineUnits.length - 1].x;
        for (let i = 1; i <= rightUnits; i++) {
            const newDate = new Date(lastDate);
            newDate.setFullYear(newDate.getFullYear() + i);
            this.timelineUnits.push({
                date: newDate,
                x: lastX + i * this.UNIT_WIDTH,
                label: newDate.getFullYear().toString()
            });
        }

        this.svgWidth += (leftUnits + rightUnits) * this.UNIT_WIDTH;
        this.xOffset += leftOffset;
    }

    generateDayTimeline() {
        const currentDate = new Date(this.timelineStart);
        let x = 0;
        let currentMonth = -1;
        let monthStart = 0;

        while (currentDate <= this.timelineEnd) {
            const dayOfWeek = currentDate.getDay();
            const month = currentDate.getMonth();

            this.timelineUnits.push({
                date: new Date(currentDate),
                x,
                label: currentDate.getDate().toString(),
                isWeekend: dayOfWeek === 0 || dayOfWeek === 6
            });

            if (month !== currentMonth) {
                if (currentMonth !== -1) {
                    this.timelineGroups[this.timelineGroups.length - 1].width = x - monthStart;
                }
                currentMonth = month;
                monthStart = x;
                this.timelineGroups.push({
                    label: currentDate.toLocaleDateString('en', { month: 'short', year: 'numeric' }),
                    x: monthStart,
                    width: 0
                });
            }

            x += this.UNIT_WIDTH;
            currentDate.setDate(currentDate.getDate() + 1);
        }

        if (this.timelineGroups.length) {
            this.timelineGroups[this.timelineGroups.length - 1].width = x - monthStart;
        }

        this.svgWidth = x;
    }

    generateWeekTimeline() {
        const currentDate = new Date(this.timelineStart);
        const day = currentDate.getDay();
        currentDate.setDate(currentDate.getDate() - day + (day === 0 ? -6 : 1));

        let x = 0;
        let currentYear = -1;
        let yearStart = 0;

        while (currentDate <= this.timelineEnd) {
            const weekNum = this.getWeekNumber(currentDate);
            const year = currentDate.getFullYear();

            this.timelineUnits.push({
                date: new Date(currentDate),
                x,
                label: `CW ${weekNum}`,
                weekNumber: weekNum
            });

            if (year !== currentYear) {
                if (currentYear !== -1) {
                    this.timelineGroups[this.timelineGroups.length - 1].width = x - yearStart;
                }
                currentYear = year;
                yearStart = x;
                this.timelineGroups.push({ label: year.toString(), x: yearStart, width: 0 });
            }

            x += this.UNIT_WIDTH;
            currentDate.setDate(currentDate.getDate() + 7);
        }

        if (this.timelineGroups.length) {
            this.timelineGroups[this.timelineGroups.length - 1].width = x - yearStart;
        }

        this.svgWidth = x;
    }

    generateMonthTimeline() {
        const currentDate = new Date(this.timelineStart);
        currentDate.setDate(1);

        let x = 0;
        let currentYear = -1;
        let yearStart = 0;

        while (currentDate <= this.timelineEnd) {
            const year = currentDate.getFullYear();

            this.timelineUnits.push({
                date: new Date(currentDate),
                x,
                label: currentDate.toLocaleDateString('en', { month: 'short' })
            });

            if (year !== currentYear) {
                if (currentYear !== -1) {
                    this.timelineGroups[this.timelineGroups.length - 1].width = x - yearStart;
                }
                currentYear = year;
                yearStart = x;
                this.timelineGroups.push({ label: year.toString(), x: yearStart, width: 0 });
            }

            x += this.UNIT_WIDTH;
            currentDate.setMonth(currentDate.getMonth() + 1);
        }

        if (this.timelineGroups.length) {
            this.timelineGroups[this.timelineGroups.length - 1].width = x - yearStart;
        }

        this.svgWidth = x;
    }

    generateYearTimeline() {
        const currentDate = new Date(this.timelineStart);
        currentDate.setMonth(0, 1);
        let x = 0;

        while (currentDate <= this.timelineEnd) {
            this.timelineUnits.push({
                date: new Date(currentDate),
                x,
                label: currentDate.getFullYear().toString()
            });

            x += this.UNIT_WIDTH;
            currentDate.setFullYear(currentDate.getFullYear() + 1);
        }

        this.svgWidth = x;
    }

    render() {
        this.renderedMilestones = [];
        let currentY = this.TIMELINE_HEADER_HEIGHT;

        this.visibleRows.forEach((row, rowIndex) => {
            if (row.type === 'header') {
                currentY += this.HEADER_ROW_HEIGHT;
            } else if (row.type === 'milestone') {
                const milestone = row.data as Milestone;
                if (milestone.startDate && milestone.endDate) {
                    const x = this.dateToX(milestone.startDate);
                    const width = this.dateToX(milestone.endDate) - x;

                    this.renderedMilestones.push({
                        milestone,
                        x,
                        width: Math.max(width, 30),
                        y: currentY,
                        rowIndex
                    });
                }

                currentY += this.MILESTONE_ROW_HEIGHT;
            } else if (row.type === 'task') {
                currentY += this.TASK_HEIGHT;
            }
        });

        this.svgHeight = currentY + 20;

        // Extract dependencies
        this.extractDependencies();
    }

    // Optimized method to update only specific milestone positions without full redraw
    updateMilestonePosition(milestone: Milestone) {
        const rendered = this.renderedMilestones.find(rm => rm.milestone.id === milestone.id);
        if (rendered) {
            // Derive dates directly from string properties (startDate/endDate are stale cached values)
            const startDate = milestone.started_at ? new Date(milestone.started_at) : null;
            const endDate = milestone.due_at ? (() => { const d = new Date(milestone.due_at!); d.setHours(23, 59, 59, 999); return d; })() : null;
            if (startDate && endDate) {
                rendered.x = this.dateToX(startDate);
                rendered.width = Math.max(this.dateToX(endDate) - rendered.x, 30);
            }
        }
    }

    // Update multiple milestones efficiently
    updateMilestonePositions(milestones: Milestone[]) {
        milestones.forEach(m => this.updateMilestonePosition(m));
        // Only recalculate dependencies if they might have changed
        this.extractDependencies();
    }

    extractDependencies() {
        this.dependencies = [];
        this.renderedMilestones.forEach(rm => {
            rm.milestone.dependees?.forEach((dependee: any) => {
                // Handle both ID and Milestone object
                const dependeeId = typeof dependee === 'object' && dependee.id ? dependee.id : dependee;
                const fromMilestone = this.renderedMilestones.find(
                    r => String(r.milestone.id) === String(dependeeId)
                );
                if (fromMilestone) {
                    this.dependencies.push({ from: fromMilestone.milestone, to: rm.milestone });
                }
            });
        });
    }

    dateToX(date: Date): number {
        const timeDiff = date.getTime() - this.timelineStart.getTime();
        const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

        let x = 0;
        switch (this.viewMode) {
            case 'Day':
                x = daysDiff * this.UNIT_WIDTH;
                break;
            case 'Week': {
                const weekStart = new Date(this.timelineStart);
                const dow = weekStart.getDay();
                weekStart.setDate(weekStart.getDate() - dow + (dow === 0 ? -6 : 1));
                weekStart.setHours(0, 0, 0, 0);
                const weekDaysDiff = (date.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24);
                x = (weekDaysDiff / 7) * this.UNIT_WIDTH;
                break;
            }
            case 'Month': {
                const monthsDiff = (date.getFullYear() - this.timelineStart.getFullYear()) * 12
                    + (date.getMonth() - this.timelineStart.getMonth());
                x = monthsDiff * this.UNIT_WIDTH;
                break;
            }
            case 'Year': {
                const yearsDiff = date.getFullYear() - this.timelineStart.getFullYear();
                x = yearsDiff * this.UNIT_WIDTH;
                break;
            }
            default:
                x = daysDiff * this.UNIT_WIDTH;
        }

        // Apply x-offset to account for left-extended timeline columns
        return x + this.xOffset;
    }

    xToDate(x: number): Date {
        // Remove x-offset before converting to date
        const adjustedX = x - this.xOffset;
        const units = adjustedX / this.UNIT_WIDTH;
        const result = new Date(this.timelineStart);

        switch (this.viewMode) {
            case 'Day':
                result.setDate(result.getDate() + units);
                break;
            case 'Week': {
                const dow = result.getDay();
                result.setDate(result.getDate() - dow + (dow === 0 ? -6 : 1));
                result.setHours(0, 0, 0, 0);
                result.setDate(result.getDate() + Math.round(units * 7));
                break;
            }
            case 'Month':
                result.setMonth(result.getMonth() + units);
                break;
            case 'Year':
                result.setFullYear(result.getFullYear() + units);
                break;
        }

        return result;
    }

    getRowY(rowIndex: number): number {
        let y = this.TIMELINE_HEADER_HEIGHT;
        const rows = this.visibleRows;
        for (let i = 0; i < rowIndex; i++) {
            const row = rows[i];
            if (row.type === 'header') y += this.HEADER_ROW_HEIGHT;
            else if (row.type === 'milestone') y += this.MILESTONE_ROW_HEIGHT;
            else if (row.type === 'task') y += this.TASK_HEIGHT;
        }
        return y;
    }

    onMilestoneMouseDown(event: MouseEvent, rendered: RenderedMilestone) {
        // Ignore right-clicks - they should only trigger context menu
        if (event.button === 2) {
            event.stopPropagation();
            return;
        }

        // Ignore Ctrl/Shift clicks - nx directive handles selection
        if (event.ctrlKey || event.metaKey || event.shiftKey) {
            event.stopPropagation();
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        this.draggingMilestone = rendered.milestone;
        this.clickedMilestone = rendered.milestone;
        this.dragStartX = event.clientX;
        this.dragStartDate = rendered.milestone.started_at ? new Date(rendered.milestone.started_at) : null;
        this.hasMoved = false;

        // Store original dates for all selected milestones from NxService
        this.dragOriginalDates.clear();
        
        // Always include the clicked milestone first
        if (rendered.milestone.started_at) {
            this.dragOriginalDates.set(rendered.milestone.id, {
                start: new Date(rendered.milestone.started_at),
                end: rendered.milestone.due_at ? new Date(rendered.milestone.due_at) : null
            });
        }
        
        // Then add any other selected milestones
        this.#nxService.selected.forEach(nx => {
            const milestone = nx.nx as Milestone;
            if (milestone.started_at && milestone.id !== rendered.milestone.id) {
                this.dragOriginalDates.set(milestone.id, {
                    start: new Date(milestone.started_at),
                    end: milestone.due_at ? new Date(milestone.due_at) : null
                });
            }
        });

        if (rendered.milestone.due_at) {
            const originalStart = new Date(rendered.milestone.started_at!);
            const originalEnd = new Date(rendered.milestone.due_at);
            this.dragDuration = Math.floor((originalEnd.getTime() - originalStart.getTime()) / (1000 * 60 * 60 * 24));
        } else {
            this.dragDuration = 0;
        }
    }

    onBackgroundMouseDown(event: MouseEvent) {
        // Only start area selection on left-click without Ctrl
        if (event.button !== 0 || event.ctrlKey || event.metaKey) {
            return;
        }

        const svgRect = this.svgContainer.nativeElement.getBoundingClientRect();
        const x = event.clientX - svgRect.left;
        const y = event.clientY - svgRect.top;

        this.areaSelecting = true;
        this.areaSelectStart = { x, y };
        this.areaSelectEnd = { x, y };

        // Clear selection when starting new area selection
        this.#nxService.deselectAll();
    }

    finalizeAreaSelection() {
        const minX = Math.min(this.areaSelectStart.x, this.areaSelectEnd.x);
        const maxX = Math.max(this.areaSelectStart.x, this.areaSelectEnd.x);
        const minY = Math.min(this.areaSelectStart.y, this.areaSelectEnd.y);
        const maxY = Math.max(this.areaSelectStart.y, this.areaSelectEnd.y);

        // Get all milestone nx directives and select those that intersect
        const parent = this.svgContainer.nativeElement;
        const milestoneElements = Array.from(parent.querySelectorAll('.milestone-bar'));

        milestoneElements.forEach((element: any) => {
            if (!element.nx) return;

            const milestone = element.nx.nx as Milestone;
            const rendered = this.renderedMilestones.find(rm => rm.milestone.id === milestone.id);
            if (!rendered) return;

            const milestoneTop = rendered.y + 8;
            const milestoneBottom = rendered.y + 8 + 32;
            const milestoneLeft = rendered.x;
            const milestoneRight = rendered.x + rendered.width;

            // Check if rectangles intersect
            const intersects = !(milestoneRight < minX || milestoneLeft > maxX ||
                                 milestoneBottom < minY || milestoneTop > maxY);

            if (intersects) {
                this.#nxService.select(element.nx);
            }
        });
    }

    onDependencyDrawStart(event: MouseEvent, rendered: RenderedMilestone) {
        event.preventDefault();
        event.stopPropagation();
        this.drawingDependency = true;
        this.dependencyFromMilestone = rendered.milestone;
        this.dependencyHasMoved = false;

        // Convert to SVG coordinates
        const svgRect = this.svgContainer.nativeElement.getBoundingClientRect();
        this.dependencyMouseX = event.clientX - svgRect.left;
        this.dependencyMouseY = event.clientY - svgRect.top;

        // Initialize drawing path
        this.updateDependencyDrawingPath();
    }

    onResizeMouseDown(event: MouseEvent, rendered: RenderedMilestone, side: 'left' | 'right') {
        event.preventDefault();
        event.stopPropagation();

        // Left side is now for dependency drawing, not resizing
        if (side === 'left') {
            this.onDependencyDrawStart(event, rendered);
            return;
        }

        this.resizingMilestone = rendered.milestone;
        this.resizingSide = side;
        this.dragStartX = event.clientX;
        this.resizeStartDate = rendered.milestone.started_at ? new Date(rendered.milestone.started_at) : null;
        this.resizeEndDate = rendered.milestone.due_at ? new Date(rendered.milestone.due_at) : null;
    }

    applyDeltaToDate(date: Date, deltaUnits: number): Date {
        const result = new Date(date);
        switch (this.viewMode) {
            case 'Day':
                result.setDate(result.getDate() + deltaUnits);
                break;
            case 'Week':
                result.setDate(result.getDate() + (deltaUnits * 7));
                break;
            case 'Month':
                result.setMonth(result.getMonth() + deltaUnits);
                break;
            case 'Year':
                result.setFullYear(result.getFullYear() + deltaUnits);
                break;
        }
        return result;
    }

    onMouseMove(event: MouseEvent) {
        // Handle area selection
        if (this.areaSelecting) {
            const svgRect = this.svgContainer.nativeElement.getBoundingClientRect();
            this.areaSelectEnd = {
                x: event.clientX - svgRect.left,
                y: event.clientY - svgRect.top
            };
            return;
        }

        // Handle dependency drawing
        if (this.drawingDependency) {
            if (!this.dependencyHasMoved) {
                this.dependencyHasMoved = true;
            }

            const svgRect = this.svgContainer.nativeElement.getBoundingClientRect();

            // Convert from viewport coordinates to SVG coordinates
            // getBoundingClientRect already accounts for scroll, so just subtract the SVG's position
            this.dependencyMouseX = event.clientX - svgRect.left;
            this.dependencyMouseY = event.clientY - svgRect.top;

            // Check if mouse is over a milestone
            const target = this.getMilestoneAtPosition(event);
            this.dependencyToMilestone = target;

            // Update drawing path
            this.updateDependencyDrawingPath();
            return;
        }

        if (!this.hasMoved && Math.abs(event.clientX - this.dragStartX) > 5) {
            this.hasMoved = true;
        }

        if (this.resizingMilestone && this.resizeStartDate && this.resizeEndDate) {
            const deltaUnits = Math.round((event.clientX - this.dragStartX) / this.UNIT_WIDTH);

            if (this.resizingSide === 'right') {
                const newEnd = this.applyDeltaToDate(this.resizeEndDate, deltaUnits);
                this.resizingMilestone.due_at = newEnd.toISOString().split('T')[0];
            }

            // Use optimized position update instead of full render
            this.updateMilestonePosition(this.resizingMilestone);
            return;
        }

        if (this.draggingMilestone && this.dragStartDate) {
            const deltaUnits = Math.round((event.clientX - this.dragStartX) / this.UNIT_WIDTH);

            // Move all selected milestones using their stored original dates
            const updatedMilestones: Milestone[] = [];
            this.dragOriginalDates.forEach((originalDates, milestoneId) => {
                const milestone = this.renderedMilestones.find(rm => rm.milestone.id === milestoneId)?.milestone;
                if (milestone) {
                    const newStart = this.applyDeltaToDate(originalDates.start, deltaUnits);
                    milestone.started_at = newStart.toISOString().split('T')[0];

                    if (originalDates.end) {
                        const duration = Math.floor((originalDates.end.getTime() - originalDates.start.getTime()) / (1000 * 60 * 60 * 24));
                        const newEnd = new Date(newStart);
                        newEnd.setDate(newEnd.getDate() + duration);
                        milestone.due_at = newEnd.toISOString().split('T')[0];
                    }
                    updatedMilestones.push(milestone);
                }
            });

            // Use optimized batch update instead of full render
            this.updateMilestonePositions(updatedMilestones);
        }
    }

    onMouseUp() {
        // Handle area selection completion
        if (this.areaSelecting) {
            this.finalizeAreaSelection();
            this.areaSelecting = false;
            return;
        }

        // Handle dependency drawing completion
        if (this.drawingDependency) {
            if (!this.dependencyHasMoved && this.dependencyFromMilestone) {
                // Click without drag - remove all dependencies
                this.removeAllDependencies(this.dependencyFromMilestone);
            } else if (this.dependencyFromMilestone && this.dependencyToMilestone) {
                // Dragged to another milestone - create dependency
                this.createDependency(this.dependencyFromMilestone, this.dependencyToMilestone);
            }
            this.drawingDependency = false;
            this.dependencyFromMilestone = null;
            this.dependencyToMilestone = null;
            this.dependencyDrawingPath = '';
            this.dependencyHasMoved = false;
            return;
        }

        if (this.resizingMilestone) {
            // Save milestone directly to API
            const milestoneId = Number(this.resizingMilestone.id);
            const updateData = {
                started_at: this.resizingMilestone.started_at,
                due_at: this.resizingMilestone.due_at
            };
            this.#milestoneService.update(milestoneId, updateData).subscribe({
                next: () => {
                    Toast.success($localize`:@@i18n.milestone.updated:Milestone updated successfully`);
                },
                error: (error) => {
                    console.error('Error updating milestone:', error);
                    Toast.error($localize`:@@i18n.milestone.updateError:Failed to update milestone`);
                }
            });
            this.resizingMilestone = null;
            this.resizingSide = null;
            this.resizeStartDate = null;
            this.resizeEndDate = null;
        }

        if (this.draggingMilestone) {
            if (this.hasMoved) {
                // Update all moved milestones via API
                this.dragOriginalDates.forEach((_, milestoneId) => {
                    const milestone = this.renderedMilestones.find(rm => rm.milestone.id === milestoneId)?.milestone;
                    if (milestone) {
                        const updateData = {
                            started_at: milestone.started_at,
                            due_at: milestone.due_at
                        };
                        this.#milestoneService.update(Number(milestone.id), updateData).subscribe({
                            error: (error) => {
                                console.error('Error updating milestone:', error);
                                Toast.error($localize`:@@i18n.milestone.updateError:Failed to update milestone`);
                            }
                        });
                    }
                });
            }
            this.draggingMilestone = null;
            this.dragStartDate = null;
            this.dragDuration = 0;
            this.dragOriginalDates.clear();
        }

        this.clickedMilestone = null;
        this.hasMoved = false;
    }

    getMilestoneAtPosition(event: MouseEvent): Milestone | null {
        const svgRect = this.svgContainer.nativeElement.getBoundingClientRect();
        const x = event.clientX - svgRect.left;
        const y = event.clientY - svgRect.top;

        for (const rendered of this.renderedMilestones) {
            const barY = rendered.y + 8;
            const barHeight = 32;
            if (x >= rendered.x && x <= rendered.x + rendered.width &&
                y >= barY && y <= barY + barHeight) {
                return rendered.milestone;
            }
        }
        return null;
    }

    removeAllDependencies(milestone: Milestone) {
        if (!milestone.dependees || milestone.dependees.length === 0) {
            Toast.info($localize`:@@i18n.milestone.noDependencies:This milestone has no dependencies`);
            return;
        }

        const dependeeIds = milestone.dependees.map((dep: any) =>
            typeof dep === 'object' && dep.id ? Number(dep.id) : Number(dep)
        );

        this.#milestoneService.removeDependencies(Number(milestone.id), dependeeIds)
            .subscribe({
                next: () => {
                    milestone.dependees = [];
                    // Just recalculate dependencies, no need for full render
                    this.extractDependencies();
                    Toast.success($localize`:@@i18n.milestone.dependenciesRemoved:All dependencies removed`);
                },
                error: (error) => {
                    console.error('Error removing dependencies:', error);
                    Toast.error($localize`:@@i18n.milestone.removeDependenciesError:Failed to remove dependencies`);
                }
            });
    }

    createDependency(from: Milestone, to: Milestone) {
        // Validate: cannot link to itself
        if (from.id === to.id) {
            Toast.error($localize`:@@i18n.milestone.cannotDependOnSelf:Cannot create dependency to the same milestone`);
            return;
        }

        // Validate: must be same project
        if (from.project_id !== to.project_id) {
            Toast.error($localize`:@@i18n.milestone.dependencySameProject:Dependencies can only be created between milestones of the same project`);
            return;
        }

        // Check if dependency already exists
        if (from.dependees?.some((id: any) => String(id) === String(to.id))) {
            Toast.error($localize`:@@i18n.milestone.dependencyExists:This dependency already exists`);
            return;
        }

        // Create the dependency (from depends on to)
        this.#milestoneService.addDependency(Number(from.id), Number(to.id))
            .subscribe({
                next: () => {
                    // Update local model
                    if (!from.dependees) from.dependees = [];
                    from.dependees.push(to);

                    // Auto-adjust dates if needed
                    if (to.due_at && from.started_at) {
                        const toEndDate = new Date(to.due_at);
                        const fromStartDate = new Date(from.started_at);

                        // If dependent milestone starts before parent ends, adjust it
                        if (fromStartDate < toEndDate) {
                            from.started_at = toEndDate.toISOString().split('T')[0];

                            // Maintain duration
                            if (from.due_at) {
                                const originalDuration = Math.floor(
                                    (new Date(from.due_at).getTime() - fromStartDate.getTime()) / (1000 * 60 * 60 * 24)
                                );
                                const newEnd = new Date(toEndDate);
                                newEnd.setDate(newEnd.getDate() + originalDuration);
                                from.due_at = newEnd.toISOString().split('T')[0];
                            }

                            // Update position and save via API
                            this.updateMilestonePosition(from);
                            const updateData = {
                                started_at: from.started_at,
                                due_at: from.due_at
                            };
                            this.#milestoneService.update(Number(from.id), updateData).subscribe({
                                error: (error) => {
                                    console.error('Error updating milestone:', error);
                                    Toast.error($localize`:@@i18n.milestone.updateError:Failed to update milestone`);
                                }
                            });
                        }
                    }

                    // Just recalculate dependencies instead of full render
                    this.extractDependencies();
                    Toast.success($localize`:@@i18n.milestone.dependencyCreated:Dependency created successfully`);
                },
                error: (error) => {
                    console.error('Error creating dependency:', error);
                    Toast.error($localize`:@@i18n.milestone.dependencyError:Failed to create dependency`);
                }
            });
    }

    getMilestoneColor(milestone: Milestone): string {
        if (milestone.state === 2) return Color.fromVar('success').toHexString();
        return '#333';
    }

    getMilestoneProgressColor(milestone: Milestone): string {
        if (milestone.state === 2) return 'rgba(255, 255, 255, 0.3)';
        return Color.fromVar('cyan').toHexString();
    }

    getMilestoneLabelColor(milestone: Milestone): string {
        if (milestone.state === 2) return '#ffffff';
        if (milestone.state === 1) return '#ffffff';
        return '#666';
    }

    decodeHtmlEntities(text: string): string {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        return textarea.value;
    }

    getDependencyPath(dep: Dependency): string {
        const fromRendered = this.renderedMilestones.find(r => r.milestone.id === dep.from.id);
        const toRendered = this.renderedMilestones.find(r => r.milestone.id === dep.to.id);

        if (!fromRendered || !toRendered) return '';

        const x1 = fromRendered.x + fromRendered.width;
        const y1 = fromRendered.y + this.MILESTONE_ROW_HEIGHT / 2;
        const x2 = toRendered.x;
        const y2 = toRendered.y + this.MILESTONE_ROW_HEIGHT / 2;

        const halfGrid = this.UNIT_WIDTH / 2;

        // Check if dependent milestone starts exactly when parent ends
        const parentEnd = dep.from.due_at;
        const dependentStart = dep.to.started_at;

        if (parentEnd && dependentStart && parentEnd === dependentStart) {
            // Consecutive milestones - S-curve through vertical midpoint
            const midY = (y1 + y2) / 2;
            return `M ${x1} ${y1} L ${x1 + halfGrid} ${y1} L ${x1 + halfGrid} ${midY} L ${x2 - halfGrid} ${midY} L ${x2 - halfGrid} ${y2} L ${x2} ${y2}`;
        }

        // Check if we need inverted S-curve (dependent is to the left or close)
        const availableSpace = x2 - x1;
        if (availableSpace < halfGrid * 2) {
            // Not enough horizontal space - use inverted S-curve
            const midY = (y1 + y2) / 2;
            return `M ${x1} ${y1} L ${x1 + halfGrid} ${y1} L ${x1 + halfGrid} ${midY} L ${x2 - halfGrid} ${midY} L ${x2 - halfGrid} ${y2} L ${x2} ${y2}`;
        }

        // Standard forward dependency - right, down/up, right
        return `M ${x1} ${y1} L ${x1 + halfGrid} ${y1} L ${x1 + halfGrid} ${y2} L ${x2 - halfGrid} ${y2} L ${x2} ${y2}`;
    }

    updateDependencyDrawingPath() {
        if (!this.drawingDependency || !this.dependencyFromMilestone) {
            this.dependencyDrawingPath = '';
            return;
        }

        const fromRendered = this.renderedMilestones.find(
            r => r.milestone.id === this.dependencyFromMilestone!.id
        );
        if (!fromRendered) {
            this.dependencyDrawingPath = '';
            return;
        }

        const x1 = fromRendered.x;
        const y1 = fromRendered.y + this.MILESTONE_ROW_HEIGHT / 2;

        let x2: number;
        let y2: number;

        if (this.dependencyToMilestone) {
            const toRendered = this.renderedMilestones.find(
                r => r.milestone.id === this.dependencyToMilestone!.id
            );
            if (toRendered) {
                x2 = toRendered.x;
                y2 = toRendered.y + this.MILESTONE_ROW_HEIGHT / 2;
            } else {
                x2 = this.dependencyMouseX;
                y2 = this.dependencyMouseY;
            }
        } else {
            x2 = this.dependencyMouseX;
            y2 = this.dependencyMouseY;
        }

        // Create 90° angled path
        const midX = (x1 + x2) / 2;
        this.dependencyDrawingPath = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
    }

    navigateToProject(project: Project) {
        this.#router.navigate(['/projects', project.id, 'milestones']);
    }

    onDropdownOpenChange() {
        // Force reflow when dropdown opens or closes to fix sticky positioning
        setTimeout(() => {
            const hostElement = this.#elementRef.nativeElement;
            const currentScroll = hostElement.scrollLeft;
            hostElement.scrollLeft = currentScroll + 1;
            hostElement.scrollLeft = currentScroll;
        }, 0);
    }

    onAddMilestoneClick(project: Project, dropdown: NgbDropdown) {
        this.addMilestone.emit(project);
        setTimeout(() => dropdown.close(), 0);
    }

    onAddTaskClick(project: Project, dropdown: NgbDropdown) {
        this.addTask.emit(project);
        setTimeout(() => dropdown.close(), 0);
    }

    getProjectDurationBar(project: Project): { x: number, width: number, label: string } | null {
        const projectMilestones = this.renderedMilestones.filter(rm => rm.milestone.project_id === project.id);
        if (!projectMilestones.length) return null;

        const dates: Date[] = [];
        projectMilestones.forEach(rm => {
            if (rm.milestone.started_at) dates.push(new Date(rm.milestone.started_at));
            if (rm.milestone.due_at) dates.push(new Date(rm.milestone.due_at));
        });

        if (!dates.length) return null;

        const earliest = new Date(Math.min(...dates.map(d => d.getTime())));
        const latest = new Date(Math.max(...dates.map(d => d.getTime())));
        const durationDays = Math.ceil((latest.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24));

        let label = `${durationDays}d`;
        if (durationDays >= 7) label = `${Math.floor(durationDays / 7)}w`;
        if (durationDays >= 30) label = `${Math.floor(durationDays / 30)}mo`;
        if (durationDays >= 365) label = `${Math.floor(durationDays / 365)}y`;

        return { x: this.dateToX(earliest), width: this.dateToX(latest) - this.dateToX(earliest), label };
    }

    #calculateTodayX(): number {
        const now = new Date();
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);

        let periodStart: Date;
        let periodEnd: Date;

        switch (this.viewMode) {
            case 'Day':
                periodStart = today;
                periodEnd = new Date(today);
                periodEnd.setDate(periodEnd.getDate() + 1);
                break;
            case 'Week': {
                // Use the exact same logic as generateWeekTimeline
                periodStart = new Date(today);
                const day = periodStart.getDay();
                periodStart.setDate(periodStart.getDate() - day + (day === 0 ? -6 : 1));
                periodStart.setHours(0, 0, 0, 0);
                periodEnd = new Date(periodStart);
                periodEnd.setDate(periodEnd.getDate() + 7);
                break;
            }
            case 'Month':
                periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
                periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);
                break;
            case 'Year':
                periodStart = new Date(today.getFullYear(), 0, 1);
                periodEnd = new Date(today.getFullYear() + 1, 0, 1);
                break;
            default:
                return this.dateToX(today);
        }

        const periodDuration = periodEnd.getTime() - periodStart.getTime();
        const elapsed = now.getTime() - periodStart.getTime();
        const progress = elapsed / periodDuration;

        // For Week view, calculate position based on the week's start position
        if (this.viewMode === 'Week') {
            // Calculate how many weeks from timelineStart to periodStart
            const timelineStartAdjusted = new Date(this.timelineStart);
            const dayOfWeek = timelineStartAdjusted.getDay();
            timelineStartAdjusted.setDate(timelineStartAdjusted.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
            timelineStartAdjusted.setHours(0, 0, 0, 0);
            
            const weeksDiff = Math.floor((periodStart.getTime() - timelineStartAdjusted.getTime()) / (7 * 24 * 60 * 60 * 1000));
            return this.xOffset + (weeksDiff * this.UNIT_WIDTH) + (progress * this.UNIT_WIDTH);
        }

        return this.dateToX(periodStart) + (progress * this.UNIT_WIDTH);
    }

    getTodayX(): number {
        return this.#cachedTodayX;
    }

    getProjectDeadlines(): { project: Project, x: number, yStart: number, yEnd: number }[] {
        const deadlines: { project: Project, x: number, yStart: number, yEnd: number }[] = [];
        const projectRowRanges = new Map<string, { project: Project, startRow: number, endRow: number }>();
        const rows = this.visibleRows;

        // First pass: identify project row ranges
        rows.forEach((row, index) => {
            if (row.type === 'header' && row.project) {
                const projectId = String(row.project.id);
                if (!projectRowRanges.has(projectId)) {
                    projectRowRanges.set(projectId, {
                        project: row.project,
                        startRow: index,
                        endRow: index
                    });
                } else {
                    projectRowRanges.get(projectId)!.endRow = index;
                }
            } else if (row.project) {
                const projectId = String(row.project.id);
                const range = projectRowRanges.get(projectId);
                if (range) {
                    range.endRow = index;
                }
            }
        });

        // Second pass: create deadline markers for projects with due_at
        projectRowRanges.forEach((range) => {
            if (range.project.due_at) {
                const deadlineDate = new Date(range.project.due_at);
                const x = this.dateToX(deadlineDate);
                const yStart = this.getRowY(range.startRow);
                const yEnd = this.getRowY(range.endRow) + this.getRowHeight(rows[range.endRow]);

                deadlines.push({
                    project: range.project,
                    x,
                    yStart,
                    yEnd
                });
            }
        });

        return deadlines;
    }

    getRowHeight(row: GanttRow): number {
        if (row.type === 'header') return this.HEADER_ROW_HEIGHT;
        if (row.type === 'milestone') return this.MILESTONE_ROW_HEIGHT;
        if (row.type === 'task') return this.TASK_HEIGHT;
        return 0;
    }

    getAvatarUrl(userId: string): string {
        return `${environment.envApi}users/${userId}/icon`;
    }

    getTaskX(row: GanttRow): number {
        if (row.type !== 'task') {
            return 0;
        }
        
        // Find the parent milestone by looking at previous rows
        const rowIndex = this.visibleRows.indexOf(row);
        if (rowIndex > 0) {
            // Look backwards for the nearest milestone row
            for (let i = rowIndex - 1; i >= 0; i--) {
                if (this.visibleRows[i].type === 'milestone') {
                    const parentMilestone = this.visibleRows[i].data as Milestone;
                    const rendered = this.renderedMilestones.find(rm => String(rm.milestone.id) === String(parentMilestone.id));
                    return rendered ? rendered.x : 0;
                } else if (this.visibleRows[i].type === 'header') {
                    // Hit a header, this is a project-level task
                    break;
                }
            }
        }
        
        return 0;
    }

    getTaskWidth(row: GanttRow): number {
        if (row.type !== 'task') {
            return 200;
        }
        
        // Find the parent milestone by looking at previous rows
        const rowIndex = this.visibleRows.indexOf(row);
        if (rowIndex > 0) {
            // Look backwards for the nearest milestone row
            for (let i = rowIndex - 1; i >= 0; i--) {
                if (this.visibleRows[i].type === 'milestone') {
                    const parentMilestone = this.visibleRows[i].data as Milestone;
                    const rendered = this.renderedMilestones.find(rm => String(rm.milestone.id) === String(parentMilestone.id));
                    return rendered ? rendered.width : 200;
                } else if (this.visibleRows[i].type === 'header') {
                    // Hit a header, this is a project-level task
                    break;
                }
            }
        }
        
        return 200;
    }

    updateViewportBounds() {
        const container = this.#elementRef.nativeElement;
        this.viewportLeft = container.scrollLeft;
        this.viewportRight = container.scrollLeft + container.clientWidth;
    }

    getOffScreenIndicators(): { rowIndex: number; hasLeft: boolean; hasRight: boolean; y: number; isOverdue: boolean }[] {
        const indicators: { rowIndex: number; hasLeft: boolean; hasRight: boolean; y: number; isOverdue: boolean }[] = [];

        this.visibleRows.forEach((row, rowIndex) => {
            if (row.type !== 'milestone') return;

            // Find rendered milestone that matches this row's data
            const rowMilestone = this.renderedMilestones.find(rm => rm.milestone.id === row.data.id);
            if (!rowMilestone) return;

            const hasLeft = rowMilestone.x + rowMilestone.width < this.viewportLeft;
            const hasRight = rowMilestone.x > this.viewportRight;

            if (hasLeft || hasRight) {
                indicators.push({
                    rowIndex,
                    hasLeft,
                    hasRight,
                    y: this.getRowY(rowIndex) + this.MILESTONE_ROW_HEIGHT / 2,
                    isOverdue: this.isMilestoneOverdue(rowMilestone.milestone)
                });
            }
        });

        return indicators;
    }

    isMilestoneOverdue(milestone: Milestone): boolean {
        if (!milestone.due_at || milestone.state === 2) { // 2 = DONE
            return false;
        }
        const dueDate = new Date(milestone.due_at);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < now;
    }

    onTaskCheckboxChange(task: any, event: Event) {
        const checked = (event.target as HTMLInputElement).checked;

        if (checked) {
            // Close the task via API
            task.httpService?.close(task).subscribe({
                next: () => {
                    task.state = 1; // Update state immediately
                    this.completingTasks.add(task.id);

                    // After 5 seconds, add to disappearing set
                    setTimeout(() => {
                        if (this.completingTasks.has(task.id)) {
                            this.disappearingTasks.add(task.id);
                            this.completingTasks.delete(task.id);
                        }
                    }, 5000);
                },
                error: (error: any) => {
                    console.error('Error closing task:', error);
                    Toast.error($localize`:@@i18n.task.closeError:Failed to close task`);
                }
            });
        } else {
            // Reopen the task
            this.completingTasks.delete(task.id);
            task.httpService?.reopen(task).subscribe({
                next: () => {
                    task.state = 0; // Update state immediately
                },
                error: (error: any) => {
                    console.error('Error reopening task:', error);
                    Toast.error($localize`:@@i18n.task.reopenError:Failed to reopen task`);
                }
            });
        }
    }

    onTaskContextMenu(event: MouseEvent, task: any) {
        event.preventDefault();
        event.stopPropagation();

        // Find the project for this task
        let project: Project | undefined;
        const row = this.rows.find(r => r.type === 'task' && r.data.id === task.id);
        if (row?.project) {
            project = row.project;
        }

        // Create mock NX object for task
        const mockNxObject = {
            nx: task,
            tables: this.rows.filter(r => r.type === 'task').map(r => r.data),
            context: 'task',
            nxContext: { project },
            selected: false,
            el: { nativeElement: this.svgContainer.nativeElement },

            get nxAttribute() { return this; },
            get classActive() { return this.selected; },

            setSelected: (selected: boolean) => { mockNxObject.selected = selected; return selected; },
            toggleSelected: () => { mockNxObject.selected = !mockNxObject.selected; return mockNxObject.selected; }
        };

        this.#nxService.onRightClick(mockNxObject as any, event);
    }

    isTaskDisappearing(taskId: string): boolean {
        return this.disappearingTasks.has(taskId);
    }

    isTaskCompleting(taskId: string): boolean {
        return this.completingTasks.has(taskId);
    }

    @HostListener('scroll', ['$event'])
    onScroll(event: Event) {
        const target = event.target as HTMLElement;
        this.scrollY = target.scrollTop || 0;
        this.updateViewportBounds();
    }

    scrollToCurrentDate() {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        let currentX = 0;
        let found = false;

        switch (this.viewMode) {
            case 'Day':{
                const todayUnit = this.timelineUnits.find(unit => {
                    const unitDate = new Date(unit.date);
                    unitDate.setHours(0, 0, 0, 0);
                    return unitDate.getTime() === now.getTime();
                });
                if (todayUnit) {
                    currentX = todayUnit.x;
                    found = true;
                }
                break;}

            case 'Week':{
                const currentWeek = this.getWeekNumber(now);
                const currentYear = now.getFullYear();
                const weekUnit = this.timelineUnits.find(unit => {
                    return unit.weekNumber === currentWeek && unit.date.getFullYear() === currentYear;
                });
                if (weekUnit) {
                    currentX = weekUnit.x;
                    found = true;
                }
                break;}

            case 'Month':{
                const monthUnit = this.timelineUnits.find(unit => {
                    return unit.date.getMonth() === now.getMonth() &&
                           unit.date.getFullYear() === now.getFullYear();
                });
                if (monthUnit) {
                    currentX = monthUnit.x;
                    found = true;
                }
                break;}

            case 'Year': {
                const yearUnit = this.timelineUnits.find(unit => {
                    return unit.date.getFullYear() === now.getFullYear();
                });
                if (yearUnit) {
                    currentX = yearUnit.x;
                    found = true;
                }
                break;
            }
        }

        if (found) {
            const hostElement = this.#elementRef.nativeElement;
            const containerWidth = hostElement.clientWidth;
            const scrollPosition = currentX - (containerWidth / 2) + (this.UNIT_WIDTH / 2);
            hostElement.scrollLeft = Math.max(0, scrollPosition);
        }
    }
}
