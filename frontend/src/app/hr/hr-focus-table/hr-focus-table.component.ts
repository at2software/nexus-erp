import { Dictionary } from '@constants/constants';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, effect, inject, input, TemplateRef, untracked } from '@angular/core';
import { dayjs, Dayjs } from '@constants/dates';
import { Observable } from 'rxjs';
import { Focus } from '@models/focus/focus.model';
import { User } from '@models/user/user.model';
import { FocusService } from '@models/focus/focus.service';
import { Vacation } from '@models/vacation/vacation.model';
import { VacationService } from '@models/vacation/vacation.service';
import { NgbDateStruct, NgbDatepickerModule, NgbModal, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { Serializable } from '@models/serializable';
import { Company } from '@models/company/company.model';
import { Project } from '@models/project/project.model';
import { GlobalService } from '@models/global.service';
import { tracked } from '@constants/tracked';
import { Nx } from '@app/nx/nx.directive';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ContinuousMarkerComponent } from '@shards/continuous/continuous.marker.component';
import { FormsModule } from '@angular/forms';
import { PermissionsDirective } from '@directives/permissions.directive';
import { HotkeyDirective } from '@directives/hotkey.directive';
import { HrFocusSummaryTabComponent } from './hr-focus-summary-tab/hr-focus-summary-tab.component';
import { SearchInputComponent } from '@shards/search-input/search-input.component';

export interface TFocusDay {
    foci: Focus[];
    total: number;
    details: boolean;
    weekend: boolean;
    vacation: Vacation | null;
    date: string;
    moment: Dayjs;
}

@Component({
    selector: 'hr-focus-table',
    templateUrl: './hr-focus-table.component.html',
    styleUrls: ['./hr-focus-table.component.scss'],
    imports: [NgbTooltipModule, Nx, DatePipe, DecimalPipe, ContinuousMarkerComponent, NgbDatepickerModule, FormsModule, PermissionsDirective, HotkeyDirective, HrFocusSummaryTabComponent, SearchInputComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HrFocusTableComponent {
    readonly user = input.required<User>();
    readonly trackedUser = tracked(this.user);

    #modal = inject(NgbModal);
    #cdr = inject(ChangeDetectorRef);
    #global = inject(GlobalService);
    #focusService = inject(FocusService);
    #vacationService = inject(VacationService);

    days: TFocusDay[] = [];
    observer: Observable<Focus[]> = undefined!;
    addFocusDate: NgbDateStruct | undefined;
    // Initial month shown by the datepicker until a date is picked (its `startDate` input is non-nullable).
    protected readonly defaultFocusDate: NgbDateStruct = (() => {
        const now = new Date();
        return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
    })();
    addFocusTime: { hour: number; minute: number } = { hour: 10, minute: 0 };
    addFocusDuration = 0;
    // Optional Project/Company parent picked in the create modal; defaults to Orga when left empty.
    addFocusParent: Serializable | undefined;

    #parents: Dictionary<{ path?: string; name: string }> = {};
    #vacations: Vacation[] = [];

    readonly canManageFoci = computed(() => this.#global.user?.hasAnyRole(['admin', 'hr']) ?? false);

    constructor() {
        effect(() => {
            const user = this.user();
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
        let earliest = this.days.last()!.moment;
        const latest = this.days.first()!.moment;
        while (earliest.isBefore(latest)) {
            const d = this.#dayForDate(earliest.format(this.#dayFormatString()));
            if (d === -1) this.addDay(earliest);
            earliest = earliest.add(1, 'day');
        }
        days = days.sort(callback_reorder);
        days.forEach((_) => (_.total = _.foci.reduce((a, b) => a + b.duration, 0)));
        this.days = [...days];
        this.#cdr.markForCheck();
    }

    openAddFocusModal(content: TemplateRef<unknown>) {
        this.addFocusParent = undefined;
        this.#modal.open(content, { ariaLabelledBy: 'modal-basic-title' });
    }

    onNewEntry() {
        const userTimezone = dayjs.tz.guess();
        this.#modal.dismissAll();
        const e = { ...this.addFocusDate!, ...this.addFocusTime };
        e.month--;
        const d = dayjs.tz(e, userTimezone);
        this.#focusService.storeFor(d.format('YYYY-MM-DDTHH:mm:ss.SSSZ'), this.addFocusDuration, this.trackedUser(), this.addFocusParent?.apiPathWithId()).subscribe((_) => {
            this.addFocus(_);
            this.reorderDays();
        });
    }

    addDay = (m: Dayjs): number => {
        const node: TFocusDay = {
            date: m.format(this.#dayFormatString()),
            weekend: m.weekday() % 6 == 0,
            vacation: this.#vacationForDay(m),
            foci: [],
            details: false,
            total: 0,
            moment: m.startOf('day'),
        };
        this.days.push(node);
        return this.days.length - 1;
    };

    toggleDetails = (row: TFocusDay) => (row.details = !row.details);

    iconFor(_: Focus): string {
        if (_.parent_type == 'App\\Models\\Company') return Company.iconForId(_.parent_id!);
        if (_.parent_type == 'App\\Models\\Project') return Project.iconForId(_.parent_id!);
        return '';
    }

    fociAsSerializable = () => this.days as unknown[] as Serializable[];

    #vacationForDay = (m: Dayjs): Vacation | null =>
        this.#vacations.find((v) => m.isSameOrAfter(dayjs(v.time_started().toDate()), 'day') && m.isSameOrBefore(dayjs(v.time_ended().toDate()), 'day')) ?? null;

    #dayFormatString = () => 'DD.MM.YYYY';
    #dayFormat = (_: string) => dayjs(_).format(this.#dayFormatString());
    #dayForDate = (date: string) => this.days.findIndex((day) => day.date == date);
    #dayForFocus(focus: Focus): number {
        const started_at_formatted = this.#dayFormat(focus.started_at);
        let find = this.#dayForDate(started_at_formatted);
        if (find === -1) find = this.addDay(dayjs(focus.momentStarted().toDate()));
        return find;
    }
}
