import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, effect, inject, input, TemplateRef, untracked } from '@angular/core';
import moment from 'moment';
import { Observable } from 'rxjs';
import { Focus } from '@models/focus/focus.model';
import { User } from '@models/user/user.model';
import { FocusService } from '@models/focus/focus.service';
import { Vacation } from '@models/vacation/vacation.model';
import { VacationService } from '@models/vacation/vacation.service';
import { NgbDatepickerModule, NgbModal, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { Serializable } from 'child_process';
import tz from 'moment-timezone';
import { Company } from '@models/company/company.model';
import { Project } from '@models/project/project.model';
import { GlobalService } from '@models/global.service';
import { tracked } from '@constants/tracked';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { Nx } from '@app/nx/nx.directive';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ContinuousMarkerComponent } from '@shards/continuous/continuous.marker.component';
import { FormsModule } from '@angular/forms';
import { PermissionsDirective } from '@directives/permissions.directive';
import { HotkeyDirective } from '@directives/hotkey.directive';
import { HrFocusSummaryTabComponent } from './hr-focus-summary-tab/hr-focus-summary-tab.component';

export interface TFocusDay {
    foci: Focus[];
    total: number;
    details: boolean;
    weekend: boolean;
    vacation: Vacation | null;
    date: string;
    moment: moment.Moment;
}

@Component({
    selector: 'hr-focus-table',
    templateUrl: './hr-focus-table.component.html',
    styleUrls: ['./hr-focus-table.component.scss'],
    standalone: true,
    imports: [ToolbarComponent, NgbTooltipModule, Nx, DatePipe, DecimalPipe, ContinuousMarkerComponent, NgbDatepickerModule, FormsModule, PermissionsDirective, HotkeyDirective, HrFocusSummaryTabComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HrFocusTableComponent {
    readonly userIn = input.required<User>({ alias: 'user' });
    readonly user = tracked(this.userIn);

    #modal = inject(NgbModal);
    #cdr = inject(ChangeDetectorRef);
    #global = inject(GlobalService);
    #focusService = inject(FocusService);
    #vacationService = inject(VacationService);

    days: TFocusDay[] = [];
    observer: Observable<any> = undefined!;
    addFocusDate: any;
    addFocusTime: { hour: number; minute: number } = { hour: 10, minute: 0 };
    addFocusDuration = 0;

    #parents: Record<string, { path?: string; name: string }> = {};
    #vacations: Vacation[] = [];

    readonly canManageFoci = computed(() => this.#global.user?.hasAnyRole(['admin', 'hr']) ?? false);

    constructor() {
        effect(() => {
            const user = this.userIn();
            untracked(() => {
                this.days = [];
                this.#parents = {};
                this.observer = this.#focusService.indexFor(user);
                this.#vacations = [];
                this.#vacationService.indexAbsences(user).subscribe((vacations) => {
                    this.#vacations = vacations;
                    this.days.forEach((day) => {
                        day.vacation = this.#vacationForDay(day.moment);
                    });
                    this.#cdr.markForCheck();
                });
            });
        });
    }

    onResult(data: Focus[]) {
        data.forEach((_) => this.addFocus(_));
        this.reorderDays();
    }

    addFocus(focus: Focus) {
        const day = this.#dayForFocus(focus);
        if (focus.parent) {
            this.#parents[focus.parent.id] = { path: focus.parent_path, name: focus.getParentName() };
        }
        this.days[day].foci.push(focus);
    }

    reorderDays() {
        if (!this.days.length) return;
        const callback_reorder = (a: TFocusDay, b: TFocusDay) => b.moment.diff(a.moment, 'hours');
        let days = this.days.sort(callback_reorder);
        const earliest = this.days.last()!.moment.clone();
        const latest = this.days.first()!.moment;
        while (earliest < latest) {
            const d = this.#dayForDate(earliest.format(this.#dayFormatString()));
            if (d === -1) this.addDay(earliest);
            earliest.add(1, 'day');
        }
        days = days.sort(callback_reorder);
        days.forEach((_) => (_.total = _.foci.reduce((a, b) => a + b.duration, 0)));
        this.days = [...days];
        this.#cdr.markForCheck();
    }

    openAddFocusModal(content: TemplateRef<any>) {
        this.#modal.open(content, { ariaLabelledBy: 'modal-basic-title' });
    }

    onNewEntry() {
        const userTimezone = tz.tz.guess();
        this.#modal.dismissAll();
        const e = { ...this.addFocusDate, ...this.addFocusTime };
        e.month--;
        const d = tz.tz(e, userTimezone);
        this.#focusService.storeFor(d.toLocaleString(), this.addFocusDuration, this.user()).subscribe((_) => {
            this.addFocus(_);
            this.reorderDays();
        });
    }

    addDay = (m: moment.Moment): number => {
        const node: TFocusDay = {
            date: m.format(this.#dayFormatString()),
            weekend: m.weekday() % 6 == 0,
            vacation: this.#vacationForDay(m),
            foci: [],
            details: false,
            total: 0,
            moment: m.clone().startOf('day'),
        };
        this.days.push(node);
        return this.days.length - 1;
    };

    toggleDetails = (row: any) => (row.details = !row.details);

    iconFor(_: Focus): string {
        if (_.parent_type == 'App\\Models\\Company') return Company.iconForId(_.parent_id!);
        if (_.parent_type == 'App\\Models\\Project') return Project.iconForId(_.parent_id!);
        return '';
    }

    fociAsSerializable = () => this.days as unknown[] as Serializable[];

    #vacationForDay = (m: moment.Moment): Vacation | null =>
        this.#vacations.find((v) => m.isSameOrAfter(v.time_started(), 'day') && m.isSameOrBefore(v.time_ended(), 'day')) ?? null;

    #dayFormatString = () => 'DD.MM.YYYY';
    #dayFormat = (_: string) => moment(_).format(this.#dayFormatString());
    #dayForDate = (date: string) => this.days.findIndex((day) => day.date == date);
    #dayForFocus(focus: Focus): number {
        const started_at_formatted = this.#dayFormat(focus.started_at);
        let find = this.#dayForDate(started_at_formatted);
        if (find === -1) find = this.addDay(focus.momentStarted());
        return find;
    }
}
