import { Component, inject, Type, ViewChild, AfterViewInit } from '@angular/core';
import { NxGlobal } from '@app/nx/nx.global';
import moment from 'moment';
import { dateToMoment, momentToDate } from 'src/constants/momentToDate';
import { DndDirective } from 'src/directives/dnd.directive';
import { FileService } from 'src/models/file/file.service';
import { TRAVEL_ALLOWANCE_DATA, getTravelAllowanceByCountry, getAvailableCountries, TravelAllowanceRates } from './travel-allowance-data';

import { FormsModule } from '@angular/forms';
import { NgbDatepickerModule, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { MoneyPipe } from 'src/pipes/money.pipe';
import { AffixInputDirective } from '@directives/affix-input.directive';

interface TDay { name: string, brunch:boolean, lunch:boolean, dinner:boolean, sleep:boolean, base:number, sum:number }
type TExpenseType = [string, Type<TExpense>, string, boolean]
class TExpense {
    type  : number
    name  : string
    value : number = 0
    suffix: string = NxGlobal.global.currencySymbol()
    sum   : number = 0
    constructor(type:number) {
        this.type = type
        this.name = ExpenseType[type][0]
    }
    hasInputField = ():boolean => ExpenseType[this.type][3]
    getTotal      = ():number => this.value
    getIcon       = ():string => ExpenseType[this.type][2]
}
class TCarExpense extends TExpense {
    suffix = 'km'
    getTotal = () => this.value * .3
}
const ExpenseType:TExpenseType[] = [
    [$localize`:@@i18n.profile.car:car`, TCarExpense, 'directions_car', false],
    [$localize`:@@i18n.profile.train:train`, TExpense, 'train', false],
    [$localize`:@@i18n.profile.taxi:taxi`, TExpense, 'local_taxi', false],
    [$localize`:@@i18n.profile.publicTransport:public transport`, TExpense, 'commute', false],
    [$localize`:@@i18n.profile.oilFuelRepairs:oil, fuel, repairs`, TExpense, 'local_gas_station', false],
    [$localize`:@@i18n.profile.miscellaneous:miscellaneous`, TExpense, 'miscellaneous_services', true],
]
@Component({
    selector: 'profile-travel-expenses',
    templateUrl: './profile-travel-expenses.component.html',
    styleUrls: ['./profile-travel-expenses.component.scss'],
    standalone: true,
    imports: [FormsModule, NgbDatepickerModule, MoneyPipe, AffixInputDirective, DndDirective, NgbDropdownModule]
})
export class ProfileTravelExpensesComponent implements AfterViewInit {
    pauschSmall: number = 14
    pauschLarge: number = 28
    pauschSleep: number = 20
    selectedCountry: string = 'Deutschland'
    purpose    : string = ''
    way        : string = ''
    days       : TDay[]
    twoDayTrip : boolean     = false
    withSleep  : boolean    = false
    expenses   : TExpense[] = []
    timeDiff   : number = 0
    startDate  : any   = momentToDate(moment())
    endDate    : any     = momentToDate(moment())
    startTime  : any   = { hours: 10, minutes: 0 }
    endTime    : any     = { hours: 10, minutes: 0 }
    types      : TExpenseType[] = ExpenseType
    hasViewInitialized:boolean = false
    
    // Travel allowance data
    availableCountries: string[] = getAvailableCountries()
    travelAllowanceData: TravelAllowanceRates[] = TRAVEL_ALLOWANCE_DATA

    @ViewChild(DndDirective) dragDrop:DndDirective

    fileService = inject(FileService)

    ngAfterViewInit() {
        setTimeout(() => this.hasViewInitialized = true, 100)
        // Initialize rates for default country
        this.onCountryChange()
    }

    onCountryChange() {
        const rates = getTravelAllowanceByCountry(this.selectedCountry);
        if (rates) {
            this.pauschSmall = rates.kleinePauschale;
            this.pauschLarge = rates.grossePauschale;
            this.pauschSleep = rates.uebernachtung;
            // Update existing days if any
            if (this.days) {
                this.updateDays();
            }
        }
    }
    
    #start = () => dateToMoment({...this.startDate, ...this.startTime})
    #end = () => dateToMoment({...this.endDate, ...this.endTime})

    onSubmit() {
        this.days.forEach(_ => _.sum = this.sumFor(_))
        this.expenses.forEach(_ => _.sum = _.getTotal())
        const data:any = {
            purpose : this.purpose,
            way     : this.way,
            start   : this.#start().format('YYYY-MM-DD HH:mm'),
            end     : this.#end().format('YYYY-MM-DD HH:mm'),
            days    : this.days,
            expenses: this.expenses
        }
        this.dragDrop.formData.append('data', JSON.stringify(data))
        this.fileService.uploadTravelExpenses(this.dragDrop.formData, () => {
            this.dragDrop.clear()
        })
    }

    updateDays() {
        const response:TDay[] = []
        const m = this.#start().clone().startOf('day')
        while (m <= this.#end().clone().endOf('day')) {
            response.push({ name: m.format('YYYY-MM-DD'), brunch:false, lunch:false, dinner:false, sleep:true, base:this.pauschLarge, sum:0 })
            m.add(1, 'day')
        }
        this.twoDayTrip = response.length === 2
        if (response.length === 2 && !this.withSleep) {
            response.pop()
        }
        if (response.length) {
            response.first()!.base = this.pauschSmall
            response.last()!.base = this.pauschSmall
        }
        this.timeDiff = this.#end().diff(this.#start(), 'hours')
        this.days = response
    }
    addExpense = (type:number) => this.expenses.push(new this.types[type][1](type))
    sumFor = (_:TDay) => Math.max(0, _.base - this.pauschLarge * (.2 * (_.brunch ? 1 : 0) + .4 * (_.lunch ? 1 : 0) + .4 * (_.dinner ? 1 : 0)) + (!_.sleep ? this.pauschSleep : 0))
}
