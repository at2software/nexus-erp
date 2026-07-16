import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbDateAdapter } from '@ng-bootstrap/ng-bootstrap';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { DaterangepickerDirective, NgxDaterangepickerMd } from 'ngx-daterangepicker-material';
import { NgbDateCarbonAdapter } from '@directives/ngb-date.adapter';
import { GlobalService } from '@models/global.service';
import { Vacation } from '@models/vacation/vacation.model';
import { VacationService } from '@models/vacation/vacation.service';

type TimePeriod = NonNullable<DaterangepickerDirective['value']>;

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'profile-sick-note',
    templateUrl: './profile-sick-note.component.html',
    providers: [{ provide: NgbDateAdapter, useClass: NgbDateCarbonAdapter }],
    imports: [EmptyStateComponent, FormsModule, NgxDaterangepickerMd],
})
export class ProfileSickNoteComponent {
    sickPeriod: TimePeriod | null = null;
    hasESickNote = signal(false);
    formHasBeenSent = signal(false);

    global = inject(GlobalService);
    #vacationService = inject(VacationService);

    onSendSickNote() {
        const payload = Vacation.fromJson({
            started_at: this.sickPeriod?.startDate?.format?.('YYYY-MM-DD') ?? this.sickPeriod?.startDate,
            ended_at: this.sickPeriod?.endDate?.format?.('YYYY-MM-DD') ?? this.sickPeriod?.endDate,
            state: Vacation.STATE_SICK,
            comment: this.hasESickNote() ? $localize`:@@i18n.profile.eSickNote:electronic sick note` : $localize`:@@i18n.profile.pSickNote:printed sick note`,
        });
        this.formHasBeenSent.set(true);
        this.#vacationService.storeSickNote(payload).subscribe();
    }
    onResetForm() {
        this.sickPeriod = null;
        this.hasESickNote.set(false);
        this.formHasBeenSent.set(false);
    }
}
