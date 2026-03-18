
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbDateAdapter, NgbDatepickerModule } from '@ng-bootstrap/ng-bootstrap';
import moment from 'moment';
import { ModalBaseComponent } from '@app/_modals/modal-base.component';
import { NgbDateCarbonAdapter } from 'src/directives/ngb-date.adapter';
import { UserEmployment } from 'src/models/user/user-employment.model';
import { User } from 'src/models/user/user.model';
import { HotkeyDirective } from '@directives/hotkey.directive';

@Component({
    selector: 'modal-new-employment',
    templateUrl: './modal-new-employment.component.html',
    styleUrls: ['./modal-new-employment.component.scss'],
    providers: [{ provide: NgbDateAdapter, useClass: NgbDateCarbonAdapter }],
    standalone: true,
    imports: [FormsModule, NgbDatepickerModule, HotkeyDirective]
})
export class ModalNewEmploymentComponent extends ModalBaseComponent<UserEmployment> {

    TYPES = ['Festanstellung', 'Praktikum', 'Werkstudent']
    TIME_BASED_TYPES = ['Werkstudent']

    type:string = this.TYPES[0]
    hpw:number = 40
    user:User
    start:string

    init(...args: any): void {
        this.user = args[0]
    }
    onSuccess() {
        const e = UserEmployment.fromJson({})
        const hpd = this.hpw / 5
        e.user_id = this.user.id
        e.description = this.type
        e.mo = hpd
        e.tu = hpd
        e.we = hpd
        e.th = hpd
        e.fr = hpd
        e.sa = 0
        e.su = 0
        e.is_time_based = this.TIME_BASED_TYPES.includes(this.type)
        e.started_at = this.start
        e.is_active = moment(this.start, 'YYYY-MM-DD').diff(moment(), 'seconds') < 0
        return e
    }

}
