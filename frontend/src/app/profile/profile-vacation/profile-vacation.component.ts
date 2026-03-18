import { Component, OnInit, inject } from '@angular/core';
import { GlobalService } from 'src/models/global.service';
import { User } from 'src/models/user/user.model';
import { ProfileVacationWidgetComponent } from '../widgets/profile-vacation-widget/profile-vacation-widget.component';
import { HrVacationComponent } from '@app/hr/hr-vacation/hr-vacation.component';


@Component({
    selector: 'app-profile-vacation',
    templateUrl: './profile-vacation.component.html',
    styleUrls: ['./profile-vacation.component.scss'],
    standalone: true,
    imports: [ProfileVacationWidgetComponent, HrVacationComponent]
})
export class ProfileVacationComponent implements OnInit {

    user:User
    #global = inject(GlobalService)

    ngOnInit(): void {
        this.user = this.#global.user!
    }

}
