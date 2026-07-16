import { ChangeDetectionStrategy, Component, inject, model, signal, TemplateRef } from '@angular/core';
import { GlobalService } from '@models/global.service';
import { User } from '@models/user/user.model';
import { HrTeamService } from '../hr-team/hr-team.service';
import { HrVacationContainerComponent } from './hr-vacation-container.component';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbDatepickerModule, NgbCalendar, NgbDate, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { VacationService } from '@models/vacation/vacation.service';
import { Vacation } from '@models/vacation/vacation.model';
import { VacationGrant } from '@models/vacation/vacation-grant.model';
import { dayjs } from '@constants/dates';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';

@Component({
    selector: 'hr-vacation-cols',
    templateUrl: './hr-vacation-cols.component.html',
    imports: [HrVacationContainerComponent, DecimalPipe, FormsModule, NgbDatepickerModule, ToolbarComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HrVacationColsComponent {
    #global = inject(GlobalService);
    #parent = inject(HrTeamService);
    #calendar = inject(NgbCalendar);
    #vacationService = inject(VacationService);
    #modalService = inject(NgbModal);

    user = model<User>();

    newWorkingHours = signal({ mo: 0, tu: 0, we: 0, th: 0, fr: 0 });
    effectiveDate: NgbDate | null = null;
    vacationDaysPerYear = 25;
    vacationCalculation = signal<{ remainingMonths: number; avgHoursChange: number; adjustmentHours: number } | null>(null);

    #grants: VacationGrant[] = [];

    constructor() {
        this.effectiveDate = this.#calendar.getToday();
        this.#parent.onUserChange.subscribe((_) => {
            this.user.set(_);
            this.#initializeNewWorkingHours();
            this.#loadVacationGrants();
        });
        this.#initializeNewWorkingHours();
        this.#loadVacationGrants();
    }

    #loadVacationGrants() {
        const user = this.user();
        if (user) {
            this.#vacationService.indexGrants(user).subscribe((grants) => {
                this.#grants = grants;
            });
        }
    }

    #initializeNewWorkingHours() {
        const user = this.user();
        if (user?.active_employment) {
            this.newWorkingHours.set({
                mo: user.active_employment.mo || 0,
                tu: user.active_employment.tu || 0,
                we: user.active_employment.we || 0,
                th: user.active_employment.th || 0,
                fr: user.active_employment.fr || 0,
            });
            this.calculateVacationAdjustment();
        }
    }

    calculateVacationAdjustment() {
        const user = this.user();
        if (!user?.active_employment || !this.effectiveDate || !this.vacationDaysPerYear) {
            this.vacationCalculation.set(null);
            return;
        }

        const newWorkingHours = this.newWorkingHours();
        const currentHours = [user.active_employment.mo || 0, user.active_employment.tu || 0, user.active_employment.we || 0, user.active_employment.th || 0, user.active_employment.fr || 0];
        const newHours = [newWorkingHours.mo, newWorkingHours.tu, newWorkingHours.we, newWorkingHours.th, newWorkingHours.fr];

        const currentAvgDaily = currentHours.reduce((sum, h) => sum + h, 0) / 5;
        const newAvgDaily = newHours.reduce((sum, h) => sum + h, 0) / 5;
        const avgHoursChange = newAvgDaily - currentAvgDaily;

        let remainingMonths = Math.max(0, 12 - this.effectiveDate.month + 1);
        if (this.effectiveDate.day > 15) remainingMonths -= 0.5;

        this.vacationCalculation.set({
            remainingMonths,
            avgHoursChange,
            adjustmentHours: ((this.vacationDaysPerYear * remainingMonths) / 12) * avgHoursChange,
        });
    }

    canUpdateHours(): boolean {
        const user = this.user();
        return !!(user?.active_employment && this.effectiveDate && this.vacationDaysPerYear > 0 && this.vacationCalculation());
    }

    onHpwUpdated() {
        if (!this.canUpdateHours()) return;
        const user = this.user();
        if (!user?.active_employment) return;

        const newWorkingHours = this.newWorkingHours();
        user.active_employment.update(newWorkingHours).subscribe(() => {
            user.active_employment.mo = newWorkingHours.mo;
            user.active_employment.tu = newWorkingHours.tu;
            user.active_employment.we = newWorkingHours.we;
            user.active_employment.th = newWorkingHours.th;
            user.active_employment.fr = newWorkingHours.fr;
            this.#createVacationAdjustmentEntry();
            this.calculateVacationAdjustment();
            this.user.update((u) => (u ? Object.assign(Object.create(Object.getPrototypeOf(u)), u) : u));
        });
    }

    open(content: TemplateRef<unknown>) {
        this.#modalService.open(content, { ariaLabelledBy: 'modal-basic-title' });
    }

    #createVacationAdjustmentEntry() {
        const user = this.user();
        const vacationCalculation = this.vacationCalculation();
        if (!vacationCalculation || !user?.active_employment || !this.#grants.length) return;

        const vacation = Vacation.fromJson({});
        vacation.comment = `Working hours adjustment: ${vacationCalculation.avgHoursChange >= 0 ? '+' : ''}${vacationCalculation.avgHoursChange.toFixed(2)} hours/day average change. Formula: ${this.vacationDaysPerYear} days × ${vacationCalculation.remainingMonths}/12 months × ${vacationCalculation.avgHoursChange.toFixed(2)} hours = ${vacationCalculation.adjustmentHours >= 0 ? '+' : ''}${vacationCalculation.adjustmentHours.toFixed(2)} vacation hours adjustment`;
        vacation.amount = vacationCalculation.adjustmentHours;
        vacation.approved_by_id = this.#global.user!.id;
        vacation.started_at = dayjs(new Date(this.effectiveDate!.year, this.effectiveDate!.month - 1, this.effectiveDate!.day)).format('YYYY-MM-DD');
        vacation.state = Vacation.STATE_APPROVED;
        vacation.vacation_grant_id = this.#grants[0].id;

        this.#vacationService.storeManual(vacation).subscribe();
    }
}
