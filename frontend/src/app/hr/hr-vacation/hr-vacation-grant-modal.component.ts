import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbDateAdapter, NgbDatepickerModule } from '@ng-bootstrap/ng-bootstrap';
import { dayjs } from '@constants/date/dates';
import { ModalBaseComponent } from '@app/_modals/modal-base.component';
import { NgbDateCarbonAdapter } from '@directives/ngb-date.adapter';
import { User } from '@models/user/user.model';
import { VacationGrant } from '@models/vacation/vacation-grant.model';
import { HotkeyDirective } from '@directives/hotkey.directive';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'hr-vacation-grant-modal',
    templateUrl: './hr-vacation-grant-modal.component.html',
    providers: [{ provide: NgbDateAdapter, useClass: NgbDateCarbonAdapter }],
    imports: [FormsModule, NgbDatepickerModule, HotkeyDirective],
})
export class HrVacationGrantModalComponent extends ModalBaseComponent<VacationGrant> {
    grant!: VacationGrant;
    user!: User;
    init(grant: VacationGrant, user: User): void {
        const affectedYear = dayjs().month() < 6 ? dayjs().year() : dayjs().year() + 1;
        this.grant = grant;
        this.user = user;
        this.grant.var.amount = 25;
        this.grant.user_id = this.user.id;
        this.grant.name = 'Urlaubsanspruch ' + affectedYear;
        this.grant.expires_at = dayjs(affectedYear + 1 + '-04-15').format('YYYY-MM-DD');
    }
    onSuccess() {
        this.grant.amount = this.grant.var.amount * this.user.getAverageHpd();
        return this.grant;
    }
}
