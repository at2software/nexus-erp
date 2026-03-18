
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbDateAdapter } from '@ng-bootstrap/ng-bootstrap';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { NgxDaterangepickerMd } from 'ngx-daterangepicker-material';
import { NgbDateCarbonAdapter } from 'src/directives/ngb-date.adapter';
import { GlobalService } from 'src/models/global.service';
import { Vacation } from 'src/models/vacation/vacation.model';
import { VacationService } from 'src/models/vacation/vacation.service';

@Component({
    selector: 'profile-sick-note',
    templateUrl: './profile-sick-note.component.html',
    styleUrls: ['./profile-sick-note.component.scss'],
    providers: [{ provide: NgbDateAdapter, useClass: NgbDateCarbonAdapter }],
    standalone: true,
    imports: [EmptyStateComponent, FormsModule, NgxDaterangepickerMd]
})
export class ProfileSickNoteComponent {

    sickPeriod: { startDate: any, endDate: any }
    hasESickNote:boolean = false
    formHasBeenSent:boolean = false

    global = inject(GlobalService)
    vacationService = inject(VacationService)

    onSendSickNote() {
        const payload = Vacation.fromJson({
            started_at: this.sickPeriod.startDate,
            ended_at: this.sickPeriod.endDate,
            state: Vacation.STATE_SICK,
            comment: this.hasESickNote ? $localize`:@@i18n.profile.eSickNote:electronic sick note` : $localize`:@@i18n.profile.pSickNote:printed sick note`
        })
        this.formHasBeenSent = true
        this.vacationService.storeSickNote(payload).subscribe()
    }
    onResetForm() {
        this.sickPeriod = { startDate: undefined, endDate: undefined }
        this.hasESickNote = false
        this.formHasBeenSent = true
    }
}
