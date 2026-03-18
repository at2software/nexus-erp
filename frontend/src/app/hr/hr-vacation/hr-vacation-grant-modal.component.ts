
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbDateAdapter, NgbDatepickerModule } from '@ng-bootstrap/ng-bootstrap';
import moment from 'moment';
import { ModalBaseComponent } from '@app/_modals/modal-base.component';
import { NgbDateCarbonAdapter } from 'src/directives/ngb-date.adapter';
import { User } from 'src/models/user/user.model';
import { VacationGrant } from 'src/models/vacation/vacation-grant.model';
import { HotkeyDirective } from '@directives/hotkey.directive';

@Component({
    selector: 'hr-vacation-grant-modal',
    templateUrl: './hr-vacation-grant-modal.component.html',
    styleUrls: ['./hr-vacation-grant-modal.component.scss'],
    providers: [{ provide: NgbDateAdapter, useClass: NgbDateCarbonAdapter }],
    standalone: true,
    imports: [FormsModule, NgbDatepickerModule, HotkeyDirective]
})
export class HrVacationGrantModalComponent extends ModalBaseComponent<VacationGrant> {
    grant:VacationGrant
    user:User
    init(...args: any): void {
        const affectedYear = moment().month() < 6 ? moment().year() : moment().year() + 1
        this.grant            = args[0]
        this.user             = args[1]
        this.grant.var.amount = 25
        this.grant.user_id    = this.user.id
        this.grant.name       = 'Urlaubsanspruch ' + affectedYear
        this.grant.expires_at = moment((affectedYear + 1) + '-04-15').toISOString()
    }
    onSuccess() {
        this.grant.amount = this.grant.var.amount * this.user.getAverageHpd()
        return this.grant
    }
}
