import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';
import { tracked } from '@constants/tracked';
import { ModalBaseService } from '@app/_modals/modal-base-service';
import { VacationGrant } from '@models/vacation/vacation-grant.model';
import { HrVacationGrantModalComponent } from './hr-vacation-grant-modal.component';
import { HrVacationComponent } from './hr-vacation.component';
import { HrTeamService } from '../hr-team/hr-team.service';
import { HotkeyDirective } from '@directives/hotkey.directive';

@Component({
    selector: 'hr-vacation-container',
    templateUrl: './hr-vacation-container.component.html',
    imports: [HrVacationComponent, HotkeyDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HrVacationContainerComponent {
    #parent = inject(HrTeamService);
    #modal = inject(ModalBaseService);

    protected readonly hrVacationComponent = viewChild(HrVacationComponent);

    readonly currentUser = tracked(this.#parent.user);

    onAddGrant() {
        this.#modal.open(HrVacationGrantModalComponent, VacationGrant.fromJson({}), this.currentUser()!).then((_) => {
            if (!_) return;
            _.store({ name: _.name, expires_at: _.expires_at, amount: _.amount, user_id: _.user_id }).subscribe(() => this.hrVacationComponent()?.reload());
        });
    }
}
