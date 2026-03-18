import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbDateAdapter } from '@ng-bootstrap/ng-bootstrap';
import { NgxDaterangepickerMd } from 'ngx-daterangepicker-material';
import { NgbDateCarbonAdapter } from 'src/directives/ngb-date.adapter';
import { ModalBaseComponent } from '@app/_modals/modal-base.component';
import { User } from 'src/models/user/user.model';
import { Vacation } from 'src/models/vacation/vacation.model';
import { VacationService } from 'src/models/vacation/vacation.service';

@Component({
    selector: 'hr-sick-note-modal',
    templateUrl: './hr-sick-note-modal.component.html',
    styleUrls: ['./hr-sick-note-modal.component.scss'],
    providers: [{ provide: NgbDateAdapter, useClass: NgbDateCarbonAdapter }],
    standalone: true,
    imports: [FormsModule, NgxDaterangepickerMd]
})
export class HrSickNoteModalComponent extends ModalBaseComponent<void> {

    sickPeriod: { startDate: any, endDate: any }
    hasESickNote: boolean = false
    user: User

    vacationService = inject(VacationService)

    init(...args: any): void {
        this.user = args[0].user
    }

    onSuccess(): void {
        // This modal doesn't return any value
    }

    onSendSickNote() {
        const payload = {
            started_at: this.sickPeriod.startDate,
            ended_at: this.sickPeriod.endDate,
            state: Vacation.STATE_SICK,
            comment: this.hasESickNote ? $localize`:@@i18n.profile.eSickNote:electronic sick note` : $localize`:@@i18n.profile.pSickNote:printed sick note`,
            user_id: this.user.id
        }
        this.vacationService.storeSickNoteForOther(payload).subscribe(() => {
            this.dismiss()
        })
    }
}
