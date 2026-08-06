import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, signal, TemplateRef } from '@angular/core';
import { GlobalService } from '@models/global.service';
import { HrTeamService } from '../hr-team/hr-team.service';
import { HrVacationContainerComponent } from './hr-vacation-container.component';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbDatepickerModule, NgbCalendar, NgbDate, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { modelListResource } from '@models/http/model-resource';
import { VacationService } from '@models/vacation/vacation.service';
import { Vacation } from '@models/vacation/vacation.model';
import { dayjs } from '@constants/date/dates';
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

    readonly user = this.#parent.user;

    readonly newWorkingHours = linkedSignal(() => {
        const e = this.user()?.active_employment;
        return { mo: e?.mo || 0, tu: e?.tu || 0, we: e?.we || 0, th: e?.th || 0, fr: e?.fr || 0 };
    });
    readonly effectiveDate = signal<NgbDate | null>(this.#calendar.getToday());
    readonly vacationDaysPerYear = signal(25);

    readonly #grantsResource = modelListResource(
        () => this.#parent.userId(),
        (userId) => this.#vacationService.indexGrants(userId),
    );
    readonly #grants = this.#grantsResource.value;

    readonly vacationCalculation = computed(() => {
        const employment = this.user()?.active_employment;
        const effectiveDate = this.effectiveDate();
        const daysPerYear = this.vacationDaysPerYear();
        if (!employment || !effectiveDate || !daysPerYear) return null;

        const hours = this.newWorkingHours();
        const currentHours = [employment.mo || 0, employment.tu || 0, employment.we || 0, employment.th || 0, employment.fr || 0];
        const newHours = [hours.mo, hours.tu, hours.we, hours.th, hours.fr];
        const avgHoursChange = (newHours.sum() - currentHours.sum()) / 5;

        let remainingMonths = Math.max(0, 12 - effectiveDate.month + 1);
        if (effectiveDate.day > 15) remainingMonths -= 0.5;

        return { remainingMonths, avgHoursChange, adjustmentHours: ((daysPerYear * remainingMonths) / 12) * avgHoursChange };
    });

    canUpdateHours = () => !!(this.user()?.active_employment && this.effectiveDate() && this.vacationDaysPerYear() > 0 && this.vacationCalculation());

    onHpwUpdated() {
        if (!this.canUpdateHours()) return;
        const employment = this.user()?.active_employment;
        if (!employment) return;

        const newWorkingHours = this.newWorkingHours();
        employment.update(newWorkingHours).subscribe(() => {
            this.#createVacationAdjustmentEntry();
            Object.assign(employment, newWorkingHours);
        });
    }

    open(content: TemplateRef<unknown>) {
        this.#modalService.open(content, { ariaLabelledBy: 'modal-basic-title' });
    }

    #createVacationAdjustmentEntry() {
        const calc = this.vacationCalculation();
        const effectiveDate = this.effectiveDate();
        const grants = this.#grants();
        if (!calc || !effectiveDate || !grants.length) return;

        const vacation = Vacation.fromJson({});
        vacation.comment = `Working hours adjustment: ${calc.avgHoursChange >= 0 ? '+' : ''}${calc.avgHoursChange.toFixed(2)} hours/day average change. Formula: ${this.vacationDaysPerYear()} days × ${calc.remainingMonths}/12 months × ${calc.avgHoursChange.toFixed(2)} hours = ${calc.adjustmentHours >= 0 ? '+' : ''}${calc.adjustmentHours.toFixed(2)} vacation hours adjustment`;
        vacation.amount = calc.adjustmentHours;
        vacation.approved_by_id = this.#global.user!.id;
        vacation.started_at = dayjs(new Date(effectiveDate.year, effectiveDate.month - 1, effectiveDate.day)).format('YYYY-MM-DD');
        vacation.state = Vacation.STATE_APPROVED;
        vacation.vacation_grant_id = grants[0].id;

        this.#vacationService.storeManual(vacation).subscribe();
    }
}
