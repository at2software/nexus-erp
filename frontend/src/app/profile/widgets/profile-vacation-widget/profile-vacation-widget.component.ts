import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import moment from 'moment';
import { GlobalService } from 'src/models/global.service';
import { User } from 'src/models/user/user.model';
import { Vacation } from 'src/models/vacation/vacation.model';
import { VacationService } from 'src/models/vacation/vacation.service';
import { LoadingPipe } from 'src/pipes/loading.pipe';

@Component({
    selector: 'profile-vacation-widget',
    templateUrl: './profile-vacation-widget.component.html',
    styleUrls: ['./profile-vacation-widget.component.scss'],
    standalone: true,
    imports: [LoadingPipe, CommonModule]
})
export class ProfileVacationWidgetComponent implements OnInit {

    totalVacationHours:number
    totalVacationDays:number

    #vacationService = inject(VacationService)
    global = inject(GlobalService)

    ngOnInit() {
        this.reload(this.global.user!)
    }
    reload(user:User) {
        this.#vacationService.indexGrants(user).subscribe(grants => {
            this.totalVacationHours = 0
            this.totalVacationDays = 0
            grants.forEach(grant => {
                grant.vacations.sort((a:Vacation,b:Vacation) => b.started_at!.localeCompare(a.started_at!))
                this.totalVacationHours += grant.remainingHours()
                this.totalVacationDays += grant.remainingDays(user)
            })
        })
    }
    getWorkingHoursPerDay = () => this.global.user?.getHpwArray().map((_, k) => [moment.weekdaysMin()[(k + 1) % 7], _])
}
