import { GlobalService } from '@models/global.service';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'calendar-nav',
    templateUrl: './calendar-nav.component.html',
    styleUrls: ['./calendar-nav.component.scss'],
    standalone: true,
    imports: [RouterModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarNavComponent {
    settingKeys: string[] = [];

    #global = inject(GlobalService);

    reloadEnvironment = () => this.#global.reload();
}
