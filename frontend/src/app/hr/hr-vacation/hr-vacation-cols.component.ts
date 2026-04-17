import { Component, inject, signal, TemplateRef, WritableSignal, OnInit, model } from '@angular/core';
import { GlobalService } from 'src/models/global.service';
import { User } from 'src/models/user/user.model';
import { HrTeamService } from '../hr-team/hr-team.service';
import { HrVacationContainerComponent } from './hr-vacation-container.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbDatepickerModule, NgbCalendar, NgbDate, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { VacationService } from 'src/models/vacation/vacation.service';
import { Vacation } from 'src/models/vacation/vacation.model';
import { VacationGrant } from 'src/models/vacation/vacation-grant.model';
import moment from 'moment';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';

@Component({
    selector: 'hr-vacation-cols',
    templateUrl: './hr-vacation-cols.component.html',
    styleUrls: ['./hr-vacation-cols.component.scss'],
    standalone: true,
    imports: [HrVacationContainerComponent, CommonModule, FormsModule, NgbDatepickerModule, ToolbarComponent]
})
export class HrVacationColsComponent implements OnInit {
    
    user = model<User>()

    global = inject(GlobalService)    
    #parent = inject(HrTeamService)
    calendar = inject(NgbCalendar)
    #vacationService = inject(VacationService)
	#modalService = inject(NgbModal)
    
	closeResult: WritableSignal<string> = signal('');
    newWorkingHours = { mo: 0, tu: 0, we: 0, th: 0, fr: 0 }
    effectiveDate: NgbDate | null = null
    vacationDaysPerYear: number = 25
    vacationCalculation: {
        remainingMonths: number,
        avgHoursChange: number,
        adjustmentHours: number
    } | null = null
    grants: VacationGrant[] = []

    ngOnInit() {
        this.#parent.onUserChange.subscribe(_ => {
            this.user.set(_)
            this.initializeNewWorkingHours()
            this.loadVacationGrants()
        })
        this.initializeNewWorkingHours()
        this.loadVacationGrants()
        this.effectiveDate = this.calendar.getToday()
    }

    loadVacationGrants() {
        const user = this.user()
        if (user) {
            this.#vacationService.indexGrants(user).subscribe(grants => {
                this.grants = grants
            })
        }
    }

    initializeNewWorkingHours() {
        const user = this.user()
        if (user?.active_employment) {
            this.newWorkingHours = {
                mo: user.active_employment.mo || 0,
                tu: user.active_employment.tu || 0,
                we: user.active_employment.we || 0,
                th: user.active_employment.th || 0,
                fr: user.active_employment.fr || 0
            }
            this.calculateVacationAdjustment()
        }
    }

    calculateVacationAdjustment() {
        const user = this.user()
        if (!user?.active_employment || !this.effectiveDate || !this.vacationDaysPerYear) {
            this.vacationCalculation = null
            return
        }

        const currentHours = [
            user.active_employment.mo || 0,
            user.active_employment.tu || 0,
            user.active_employment.we || 0,
            user.active_employment.th || 0,
            user.active_employment.fr || 0
        ]

        const newHours = [
            this.newWorkingHours.mo,
            this.newWorkingHours.tu,
            this.newWorkingHours.we,
            this.newWorkingHours.th,
            this.newWorkingHours.fr
        ]

        const currentAvgDaily = currentHours.reduce((sum, h) => sum + h, 0) / 5
        const newAvgDaily = newHours.reduce((sum, h) => sum + h, 0) / 5
        const avgHoursChange = newAvgDaily - currentAvgDaily

        const effectiveMonth = this.effectiveDate.month
        const effectiveDay = this.effectiveDate.day
        
        // Calculate remaining months with half-month precision
        let remainingMonths = Math.max(0, 12 - effectiveMonth + 1)
        if (effectiveDay > 15) {
            remainingMonths -= 0.5 // If after 15th, subtract half month
        }

        const adjustmentHours = (this.vacationDaysPerYear * remainingMonths / 12) * avgHoursChange

        this.vacationCalculation = {
            remainingMonths,
            avgHoursChange,
            adjustmentHours
        }
    }

    canUpdateHours(): boolean {
        const user = this.user()
        return !!(user?.active_employment && 
                  this.effectiveDate && 
                  this.vacationDaysPerYear > 0 &&
                  this.vacationCalculation)
    }

    onHpwUpdated() {
        if (!this.canUpdateHours()) return

        const updatedEmployment = {
            mo: this.newWorkingHours.mo,
            tu: this.newWorkingHours.tu,
            we: this.newWorkingHours.we,
            th: this.newWorkingHours.th,
            fr: this.newWorkingHours.fr
        }

        const user = this.user()
        if (!user?.active_employment) return

        user.active_employment.update(updatedEmployment).subscribe(() => {
            user.active_employment.mo = this.newWorkingHours.mo
            user.active_employment.tu = this.newWorkingHours.tu
            user.active_employment.we = this.newWorkingHours.we
            user.active_employment.th = this.newWorkingHours.th
            user.active_employment.fr = this.newWorkingHours.fr
            
            this.createVacationAdjustmentEntry()
            this.calculateVacationAdjustment()
        })
    }

    createVacationAdjustmentEntry() {
        const user = this.user()
        if (!this.vacationCalculation || !user?.active_employment) return

        const vacation = Vacation.fromJson({})
        vacation.comment = `Working hours adjustment: ${this.vacationCalculation.avgHoursChange >= 0 ? '+' : ''}${this.vacationCalculation.avgHoursChange.toFixed(2)} hours/day average change. Formula: ${this.vacationDaysPerYear} days × ${this.vacationCalculation.remainingMonths}/12 months × ${this.vacationCalculation.avgHoursChange.toFixed(2)} hours = ${this.vacationCalculation.adjustmentHours >= 0 ? '+' : ''}${this.vacationCalculation.adjustmentHours.toFixed(2)} vacation hours adjustment`
        vacation.amount = this.vacationCalculation.adjustmentHours
        vacation.approved_by_id = this.global.user!.id
        vacation.started_at = moment(new Date(this.effectiveDate!.year, this.effectiveDate!.month - 1, this.effectiveDate!.day)).format('YYYY-MM-DD')
        vacation.state = Vacation.STATE_APPROVED

        // Find the current active vacation grant
        if (this.grants && this.grants.length > 0) {
            const currentGrant = this.grants[0] // Use the first grant (typically the current year)
            vacation.vacation_grant_id = currentGrant.id
        } else {
            console.error('No vacation grants found for user')
            return
        }

        this.#vacationService.storeManual(vacation).subscribe(() => {
            console.log('Vacation adjustment entry created successfully')
        })
    }
    
	open(content: TemplateRef<any>) {
		this.#modalService.open(content, { ariaLabelledBy: 'modal-basic-title' }).result.then(
			(result) => {
				this.closeResult.set(`Closed with: ${result}`);
			},
		);
	}
}
