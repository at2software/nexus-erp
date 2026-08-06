import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbDateAdapter, NgbDatepickerModule } from '@ng-bootstrap/ng-bootstrap';
import { dayjs } from '@constants/date/dates';
import { ModalBaseComponent } from '@app/_modals/modal-base.component';
import { NgbDateCarbonAdapter } from '@directives/ngb-date.adapter';
import { UserEmployment } from '@models/user/user-employment.model';
import { User } from '@models/user/user.model';
import { HotkeyDirective } from '@directives/hotkey.directive';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'modal-new-employment',
    templateUrl: './modal-new-employment.component.html',
    providers: [{ provide: NgbDateAdapter, useClass: NgbDateCarbonAdapter }],
    imports: [FormsModule, NgbDatepickerModule, HotkeyDirective],
})
export class ModalNewEmploymentComponent extends ModalBaseComponent<UserEmployment> {
    TYPES = ['Festanstellung', 'Praktikum', 'Werkstudent'];
    TIME_BASED_TYPES = ['Werkstudent'];

    type: string = this.TYPES[0];
    hpw: number = 40;
    user!: User;
    start: string = '';

    init(user: User): void {
        this.user = user;
    }
    onSuccess() {
        const e = UserEmployment.fromJson({});
        const hpd = this.hpw / 5;
        e.user_id = this.user.id;
        e.description = this.type;
        e.mo = hpd;
        e.tu = hpd;
        e.we = hpd;
        e.th = hpd;
        e.fr = hpd;
        e.sa = 0;
        e.su = 0;
        e.is_time_based = this.TIME_BASED_TYPES.includes(this.type);
        e.started_at = this.start;
        e.is_active = dayjs(this.start, 'YYYY-MM-DD').diff(dayjs(), 'seconds') < 0;
        return e;
    }
}
