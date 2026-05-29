import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import moment from 'moment';
import { GlobalService } from '@models/global.service';
import { Vacation } from '@models/vacation/vacation.model';
import { VacationService } from '@models/vacation/vacation.service';
import { LoadingPipe } from '@pipes/loading.pipe';

@Component({
    selector: 'profile-vacation-widget',
    templateUrl: './profile-vacation-widget.component.html',
    styleUrls: ['./profile-vacation-widget.component.scss'],
    standalone: true,
    imports: [LoadingPipe, DecimalPipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileVacationWidgetComponent {
    global = inject(GlobalService);
    #vacationService = inject(VacationService);

    totalVacationHours = signal<number | undefined>(undefined);
    totalVacationDays = signal<number | undefined>(undefined);

    constructor() {
        this.#reload();
    }

    #reload() {
        const user = this.global.user!;
        this.#vacationService.indexGrants(user).subscribe((grants) => {
            let hours = 0;
            let days = 0;
            grants.forEach((grant) => {
                grant.vacations.sort((a: Vacation, b: Vacation) => b.started_at!.localeCompare(a.started_at!));
                hours += grant.remainingHours();
                days += grant.remainingDays(user);
            });
            this.totalVacationHours.set(hours);
            this.totalVacationDays.set(days);
        });
    }

    getWorkingHoursPerDay = () => this.global.user?.getHpwArray().map((_, k) => [moment.weekdaysMin()[(k + 1) % 7], _]);
}
