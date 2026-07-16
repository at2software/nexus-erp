import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbDateAdapter, NgbDatepickerModule } from '@ng-bootstrap/ng-bootstrap';
import { ModalBaseComponent } from '@app/_modals/modal-base.component';
import { NgbDateCarbonAdapter } from '@directives/ngb-date.adapter';
import { User } from '@models/user/user.model';
import { Vacation } from '@models/vacation/vacation.model';
import { HotkeyDirective } from '@directives/hotkey.directive';

@Component({
    selector: 'modal-edit-vacation',
    templateUrl: './modal-edit-vacation.component.html',
    providers: [{ provide: NgbDateAdapter, useClass: NgbDateCarbonAdapter }],
    imports: [FormsModule, NgbDatepickerModule, HotkeyDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalEditVacationComponent extends ModalBaseComponent<Vacation> {
    vacation!: Vacation;
    user!: User;
    init(vacation: Vacation, user: User): void {
        this.vacation = vacation;
        this.user = user;
        this.vacation.var.amount = 0;
    }
    onSuccess() {
        this.vacation.amount = this.vacation.var.amount * this.user.getAverageHpd();
        return this.vacation;
    }
}
