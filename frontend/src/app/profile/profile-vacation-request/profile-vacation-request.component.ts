import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AffixInputDirective } from '@directives/affix-input.directive';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import moment from 'moment';
import { NgxDaterangepickerMd } from 'ngx-daterangepicker-material';
import { Nx } from '@app/nx/nx.directive';
import { GlobalService } from '@models/global.service';
import { User } from '@models/user/user.model';
import { VacationGrant } from '@models/vacation/vacation-grant.model';
import { Vacation } from '@models/vacation/vacation.model';
import { VacationService } from '@models/vacation/vacation.service';

interface TDay {
    day: string;
    duration: number;
    originalDuration: number;
    mult: number;
    specialName: string;
    specialDescription: string | undefined;
}
interface THoliday {
    date: moment.Moment;
    datum: string;
    hinweis: string;
    name: string;
}

const STR_REGULAR_WORKDAY = 'Regulärer Arbeitstag';
const STR_PARTIAL_VACATION = 'Partieller Urlaub';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'profile-vacation-request',
    templateUrl: './profile-vacation-request.component.html',
    styleUrls: ['./profile-vacation-request.component.scss'],
    standalone: true,
    imports: [DatePipe, DecimalPipe, EmptyStateComponent, Nx, FormsModule, NgbTooltipModule, NgxDaterangepickerMd, AffixInputDirective],
})
export class ProfileVacationRequestComponent {
    global = inject(GlobalService);
    #vacationService = inject(VacationService);

    grants = signal<VacationGrant[]>([]);
    currentGrant = signal<VacationGrant | undefined>(undefined);
    dayList = signal<TDay[]>([]);
    holidays = signal<THoliday[] | undefined>(undefined);
    totalDeduction = signal(0);
    openRequests = signal<any[]>([]);

    holidayPeriod!: { startDate: any; endDate: any };
    comment: string = '';

    constructor() {
        this.#vacationService.aget('vacations/holidays', {}, Object).subscribe((h: any[]) => {
            h.forEach((_) => (_.date = moment(_.datum)));
            this.holidays.set(h);
        });
        this.#reload(this.global.user!);
    }

    #reload(_: User) {
        this.#vacationService.indexGrants(_).subscribe((_grants) => {
            _grants.forEach((grant) => {
                grant.vacations.sort((a: Vacation, b: Vacation) => b.started_at!.localeCompare(a.started_at!));
                grant.var.total = grant.remainingHours();
            });
            if (_grants.length) this.currentGrant.set(_grants[0]);
            this.grants.set(_grants);
        });
        this.#vacationService.indexRequests(_).subscribe((data: Vacation[]) => this.openRequests.set(data));
    }

    onGrantSelect = (_: VacationGrant) => this.currentGrant.set(_);
    reload = () => this.#reload(this.global.user!);

    onDatesUpdated = () => {
        if (!this.holidayPeriod?.startDate || !this.holidayPeriod?.endDate) return;

        let start = moment(this.holidayPeriod.startDate.$d);
        const end = moment(this.holidayPeriod.endDate.$d);
        if (start > end) return;

        const result: TDay[] = [];
        const assignSpecialHoliday = (day: TDay, mult: number, specialName: string, specialDescription: string | undefined) =>
            Object.assign(day, { mult, specialName, specialDescription });

        while (start < end) {
            const weekDay = start.day();
            if (weekDay !== 6 && weekDay !== 0) {
                const hpd = this.global.user!.active_employment.hpwArray()[weekDay - 1] ?? 0;
                const day: TDay = { day: start.format('DD.MM.YYYY'), duration: hpd, originalDuration: hpd, mult: 1, specialDescription: '', specialName: STR_REGULAR_WORKDAY };
                const holidays = this.holidays();
                if (holidays) {
                    for (const _ of holidays) {
                        if (_.date.isSame(start, 'day')) assignSpecialHoliday(day, 0, _.name, _.hinweis);
                    }
                }
                result.push(day);
            } else {
                result.push({ day: start.format('DD.MM.YYYY'), duration: 0, originalDuration: 0, mult: 0, specialDescription: undefined, specialName: 'Wochenende' });
            }
            start = start.add(1, 'day');
        }

        this.dayList.set(result);
        this.#recalculateTotal();
    };

    #recalculateTotal() {
        let total = 0;
        this.dayList().forEach((_) => (total += _.duration * _.mult));
        this.totalDeduction.set(total);
    }

    removePotentialHoliday = (_: TDay) => {
        _.mult = 1;
        _.duration = _.originalDuration;
        _.specialName = STR_REGULAR_WORKDAY;
        _.specialDescription = undefined;
        this.dayList.update((d) => [...d]);
        this.#recalculateTotal();
    };

    onDurationChanged = (day: TDay) => {
        this.#updateDaySpecialName(day);
        this.dayList.update((d) => [...d]);
        this.#recalculateTotal();
    };

    #updateDaySpecialName = (day: TDay) => {
        if (day.mult === 0 || day.originalDuration === 0) return;
        day.specialName = day.duration === day.originalDuration ? STR_REGULAR_WORKDAY : STR_PARTIAL_VACATION;
    };

    isDurationExceeded = (day: TDay): boolean => day.duration > day.originalDuration && day.originalDuration > 0;
    isFormValid = (): boolean => !this.dayList().some((day) => this.isDurationExceeded(day));

    onGrantRequested() {
        let total = 0;
        let log = '';
        for (const _ of this.dayList()) {
            total += _.mult * _.duration;
            log += _.day + ': ' + _.specialName + ' ' + _.duration * _.mult + 'h<br>';
        }
        const payload = Vacation.fromJson({
            comment: this.comment ?? '',
            started_at: moment(this.holidayPeriod.startDate.$d).format('YYYY-MM-DD'),
            ended_at: moment(this.holidayPeriod.endDate.$d).format('YYYY-MM-DD'),
            state: Vacation.STATE_REQUESTED,
            amount: -total,
            vacation_grant_id: this.currentGrant()!.id,
            log,
        });
        payload.store().subscribe(() => {
            this.dayList.set([]);
            this.#reload(this.global.user!);
        });
    }
}
