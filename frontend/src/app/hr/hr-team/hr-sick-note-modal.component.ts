import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbDateAdapter } from '@ng-bootstrap/ng-bootstrap';
import { NgxDaterangepickerMd } from 'ngx-daterangepicker-material';
import { NgbDateCarbonAdapter } from '@directives/ngb-date.adapter';
import { ModalBaseComponent } from '@app/_modals/modal-base.component';
import { User } from '@models/user/user.model';
import { Vacation } from '@models/vacation/vacation.model';
import { VacationService } from '@models/vacation/vacation.service';
import { Dayjs } from '@constants/dates';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'hr-sick-note-modal',
    templateUrl: './hr-sick-note-modal.component.html',
    styleUrls: ['./hr-sick-note-modal.component.scss'],
    providers: [{ provide: NgbDateAdapter, useClass: NgbDateCarbonAdapter }],
    imports: [FormsModule, NgxDaterangepickerMd],
})
export class HrSickNoteModalComponent extends ModalBaseComponent<void> {
    sickPeriod!: { startDate: Dayjs; endDate: Dayjs };
    hasESickNote = signal(false);
    user!: User;

    vacationService = inject(VacationService);

    init(args: { user: User }): void {
        this.user = args.user;
    }

    onSuccess(): void {
        // This modal doesn't return any value
    }

    onSendSickNote() {
        const payload = {
            started_at: this.sickPeriod.startDate,
            ended_at: this.sickPeriod.endDate,
            state: Vacation.STATE_SICK,
            comment: this.hasESickNote() ? $localize`:@@i18n.profile.eSickNote:electronic sick note` : $localize`:@@i18n.profile.pSickNote:printed sick note`,
            user_id: this.user.id,
        };
        this.vacationService.storeSickNoteForOther(payload).subscribe(() => {
            this.dismiss();
        });
    }
}
