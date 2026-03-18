
import { Component } from '@angular/core';
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
    styleUrls: ['./modal-edit-vacation.component.scss'],
    providers: [{ provide: NgbDateAdapter, useClass: NgbDateCarbonAdapter }],
    standalone: true,
    imports: [FormsModule, NgbDatepickerModule, HotkeyDirective]
})
export class ModalEditVacationComponent extends ModalBaseComponent<Vacation> {
    vacation:Vacation
    user:User
    init(...args: any): void {
        this.vacation = args[0]
        this.user = args[1]
        this.vacation.var.amount = 0
    }
    onSuccess() {
        this.vacation.amount = this.vacation.var.amount * this.user.getAverageHpd()
        return this.vacation
    }

}
