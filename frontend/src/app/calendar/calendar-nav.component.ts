import { GlobalService } from 'src/models/global.service';
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'calendar-nav',
    templateUrl: './calendar-nav.component.html',
    styleUrls: ['./calendar-nav.component.scss'],
    standalone: true,
    imports: [RouterModule]
})
export class CalendarNavComponent {

    settingKeys: string[]

    #global = inject(GlobalService)

    reloadEnvironment = () => this.#global.reload()

}
