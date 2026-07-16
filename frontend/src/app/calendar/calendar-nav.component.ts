import { GlobalService } from '@models/global.service';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'calendar-nav',
    templateUrl: './calendar-nav.component.html',
    imports: [RouterModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarNavComponent {
    settingKeys: string[] = [];

    #global = inject(GlobalService);

    reloadEnvironment = () => this.#global.reload();
}
