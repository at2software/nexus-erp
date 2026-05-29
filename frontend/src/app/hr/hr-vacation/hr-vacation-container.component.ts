import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { tracked } from '@constants/tracked';
import { ModalBaseService } from '@app/_modals/modal-base-service';
import { User } from '@models/user/user.model';
import { VacationGrant } from '@models/vacation/vacation-grant.model';
import { HrVacationGrantModalComponent } from './hr-vacation-grant-modal.component';
import { HrVacationComponent } from './hr-vacation.component';
import { HrTeamService } from '../hr-team/hr-team.service';
import { HotkeyDirective } from '@directives/hotkey.directive';

@Component({
    selector: 'hr-vacation-container',
    templateUrl: './hr-vacation-container.component.html',
    standalone: true,
    imports: [HrVacationComponent, HotkeyDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HrVacationContainerComponent {
    #parent = inject(HrTeamService);
    #modal = inject(ModalBaseService);

    protected readonly hrVacationComponent = viewChild(HrVacationComponent);

    protected readonly _currentUser = signal<User>(null!);

    readonly currentUser = tracked(this._currentUser);

    constructor() {
        this.#parent.onUserChange.subscribe((_) => this._currentUser.set(_));
    }

    onAddGrant() {
        this.#modal.open(HrVacationGrantModalComponent, VacationGrant.fromJson({}), this.currentUser).then((_) => {
            _.store({ name: _.name, expires_at: _.expires_at, amount: _.amount, user_id: _.user_id }).subscribe(() => this.hrVacationComponent()?.reload());
        });
    }
}
