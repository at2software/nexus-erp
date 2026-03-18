import { Component, inject, Input, OnInit } from '@angular/core';
import { NgbActiveModal, NgbCalendar, NgbDate, NgbDatepickerModule } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User } from 'src/models/user/user.model';
import { VacationService } from 'src/models/vacation/vacation.service';
import { VacationGrant } from 'src/models/vacation/vacation-grant.model';
import { Vacation } from 'src/models/vacation/vacation.model';
import { GlobalService } from 'src/models/global.service';
import moment from 'moment';

@Component({
    selector: 'hr-working-hours-modal',
    templateUrl: './hr-working-hours-modal.component.html',
    standalone: true,
    imports: [CommonModule, FormsModule, NgbDatepickerModule]
})
export class HrWorkingHoursModalComponent implements OnInit {
    activeModal = inject(NgbActiveModal)
    calendar = inject(NgbCalendar)
    #vacationService = inject(VacationService)
    global = inject(GlobalService)

    @Input() user: User
    @Input() grants: VacationGrant[] = []

    newWorkingHours = { mo: 0, tu: 0, we: 0, th: 0, fr: 0 }
    effectiveDate: NgbDate | null = null
    vacationDaysPerYear: number = 25
    vacationCalculation: {
        remainingMonths: number,
        avgHoursChange: number,
        adjustmentHours: number
    } | null = null

    ngOnInit() {
        this.initializeNewWorkingHours()
        this.effectiveDate = this.calendar.getToday()
        this.calculateVacationAdjustment()
    }

    initializeNewWorkingHours() {
        if (this.user?.active_employment) {
            this.newWorkingHours = {
                mo: this.user.active_employment.mo || 0,
                tu: this.user.active_employment.tu || 0,
                we: this.user.active_employment.we || 0,
                th: this.user.active_employment.th || 0,
                fr: this.user.active_employment.fr || 0
            }
        }
    }

    calculateVacationAdjustment() {
        if (!this.user?.active_employment || !this.effectiveDate || !this.vacationDaysPerYear) {
            this.vacationCalculation = null
            return
        }

        const currentHours = [
            this.user.active_employment.mo || 0,
            this.user.active_employment.tu || 0,
            this.user.active_employment.we || 0,
            this.user.active_employment.th || 0,
            this.user.active_employment.fr || 0
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
        return !!(this.user?.active_employment && 
                  this.effectiveDate && 
                  this.vacationDaysPerYear > 0 &&
                  this.vacationCalculation)
    }

    onUpdateHours() {
        if (!this.canUpdateHours()) return

        const updatedEmployment = {
            mo: this.newWorkingHours.mo,
            tu: this.newWorkingHours.tu,
            we: this.newWorkingHours.we,
            th: this.newWorkingHours.th,
            fr: this.newWorkingHours.fr
        }

        this.user.active_employment.update(updatedEmployment).subscribe(() => {
            this.user.active_employment.mo = this.newWorkingHours.mo
            this.user.active_employment.tu = this.newWorkingHours.tu
            this.user.active_employment.we = this.newWorkingHours.we
            this.user.active_employment.th = this.newWorkingHours.th
            this.user.active_employment.fr = this.newWorkingHours.fr
            
            this.#createVacationAdjustmentEntry()
            this.activeModal.close(true)
        })
    }

    #createVacationAdjustmentEntry() {
        if (!this.vacationCalculation || !this.user?.active_employment) return

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
}