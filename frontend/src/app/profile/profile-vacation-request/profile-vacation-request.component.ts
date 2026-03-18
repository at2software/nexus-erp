import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AffixInputDirective } from '@directives/affix-input.directive';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import moment from 'moment';
import { NgxDaterangepickerMd } from 'ngx-daterangepicker-material';
import { Nx } from 'src/app/nx/nx.directive';
import { GlobalService } from 'src/models/global.service';
import { User } from 'src/models/user/user.model';
import { VacationGrant } from 'src/models/vacation/vacation-grant.model';
import { Vacation } from 'src/models/vacation/vacation.model';
import { VacationService } from 'src/models/vacation/vacation.service';

interface TDay { day: string, duration: number, originalDuration: number, mult: number, specialName:string, specialDescription:string|undefined }
interface THoliday { date: moment.Moment, datum: string, hinweis: string, name: string }

const STR_REGULAR_WORKDAY = 'Regulärer Arbeitstag'
const STR_PARTIAL_VACATION = 'Partieller Urlaub'

@Component({
    selector: 'profile-vacation-request',
    templateUrl: './profile-vacation-request.component.html',
    styleUrls: ['./profile-vacation-request.component.scss'],
    standalone: true,
    imports: [CommonModule, EmptyStateComponent, Nx, FormsModule, NgbTooltipModule, NgxDaterangepickerMd, AffixInputDirective]
})
export class ProfileVacationRequestComponent implements OnInit {

    grants        : VacationGrant[] = []
    currentGrant  : VacationGrant|undefined = undefined
    holidayPeriod : {startDate:any, endDate:any}
    comment       : string = ''
    dayList       : TDay[] = []
    holidays      : THoliday[]|undefined = undefined
    totalDeduction: number = 0
    openRequests  : any[] = []

    #vacationService = inject(VacationService)
    global           = inject(GlobalService)

    ngOnInit() {
        this.#vacationService.aget('vacations/holidays', {}, Object).subscribe((holidays:any[]) => {
            holidays.forEach(_ => {
                _.date = moment(_.datum)
            })
            this.holidays = holidays
        })
        this.reload(this.global.user!)
    }
    reload(_:User) {
        this.#vacationService.indexGrants(_).subscribe(_grants => {
            _grants.forEach(grant => {
                grant.vacations.sort((a:Vacation,b:Vacation) => b.started_at!.localeCompare(a.started_at!))
                grant.var.total = grant.remainingHours()
            })
            if (_grants.length) this.currentGrant = _grants[0]
            this.grants = _grants
        })
        this.#vacationService.indexRequests(_).subscribe((data:Vacation[]) => {
            this.openRequests = data
        })
    }
    onGrantSelect = (_:VacationGrant) => this.currentGrant = _
    onDatesUpdated = () => {
        if (this.holidayPeriod && this.holidayPeriod.startDate && this.holidayPeriod.endDate) {
            let start = moment(this.holidayPeriod.startDate.$d)
            const end = moment(this.holidayPeriod.endDate.$d)
            if (start > end) {
                console.error('end before start')
                return
            }
            this.dayList = []

            //const isDay = (date:moment.Moment, month:number, day:number) => date.month() + 1 === month && date.date() === day
            const assignSpecialHoliday =(day:any, mult:number, specialName:string, specialDescription:string|undefined) => Object.assign(day, { mult: mult, specialName: specialName, specialDescription:specialDescription })

            while (start < end) {
                const weekDay = start.day()
                if (weekDay  !== 6 && weekDay  !== 0) {
                    const hpd = this.global.user!.active_employment.hpwArray()[weekDay - 1] ?? 0
                    const day:TDay = {
                        day               : start.format('DD.MM.YYYY'),
                        duration          : hpd,
                        originalDuration  : hpd,
                        mult              : 1,
                        specialDescription: '',
                        specialName       : STR_REGULAR_WORKDAY,
                    }
                    if (this.holidays) {
                        for (const _ of this.holidays) {
                            if (_.date.isSame(start, 'day')) {
                                assignSpecialHoliday(day, 0, _.name, _.hinweis)
                            }
                        }
                    }
                    this.dayList.push(day)
                } else {
                    const day:TDay = {
                        day               : start.format('DD.MM.YYYY'),
                        duration          : 0,
                        originalDuration  : 0,
                        mult              : 0,
                        specialDescription: undefined,
                        specialName       : 'Wochenende',
                    }
                    this.dayList.push(day)
                }
                start = start.add(1, 'day')
            }
            this.recalculateTotal()
        }
    }
    recalculateTotal() {
        let total = 0
        this.dayList.forEach(_ => total += _.duration * _.mult)
        this.totalDeduction = total
    }
    removePotentialHoliday = (_:TDay) => {
        _.mult = 1
        _.duration = _.originalDuration
        _.specialName = STR_REGULAR_WORKDAY
        _.specialDescription = undefined
        this.recalculateTotal()
    }
    onDurationChanged = (day: TDay) => {
        this.updateDaySpecialName(day)
        this.recalculateTotal()
    }
    updateDaySpecialName = (day: TDay) => {
        if (day.mult === 0 || day.originalDuration === 0) return

        day.specialName = day.duration === day.originalDuration ? STR_REGULAR_WORKDAY : STR_PARTIAL_VACATION
    }

    isDurationExceeded = (day: TDay): boolean => day.duration > day.originalDuration && day.originalDuration > 0

    isFormValid = (): boolean => !this.dayList.some(day => this.isDurationExceeded(day))
    onGrantRequested() {
        let total = 0
        let log = ''
        for (const _ of this.dayList) {
            total += _.mult * _.duration
            log += _.day + ': ' + _.specialName + ' ' + (_.duration * _.mult) + "h<br>"
        }
        const payload = Vacation.fromJson({
            comment          : this.comment ?? '',
            started_at       : this.holidayPeriod.startDate,
            ended_at         : this.holidayPeriod.endDate,
            state            : Vacation.STATE_REQUESTED,
            amount           : -total,
            vacation_grant_id: this.currentGrant!.id,
            log              : log
        })
        payload.store().subscribe(() => {
            this.dayList = []
            this.reload(this.global.user!)
        })
    }

}
