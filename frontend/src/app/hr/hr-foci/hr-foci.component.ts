import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { tracked } from '@constants/tracked';
import { User } from '@models/user/user.model';
import { HrTeamService } from '../hr-team/hr-team.service';
import { HrFocusTableComponent } from '../hr-focus-table/hr-focus-table.component';

@Component({
    selector: 'hr-foci',
    templateUrl: './hr-foci.component.html',
    styleUrls: ['./hr-foci.component.scss'],
    standalone: true,
    imports: [HrFocusTableComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HrFociComponent {
    #parent = inject(HrTeamService);

    protected readonly _user = signal<User | null>(null);

    readonly user = tracked(this._user);

    constructor() {
        this.#parent.onUserChange.subscribe((_) => this._user.set(_));
    }
}
