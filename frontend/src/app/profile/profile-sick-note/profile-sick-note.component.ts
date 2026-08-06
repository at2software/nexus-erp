import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormField, form, required, schema, submit } from '@angular/forms/signals';
import { NgbDateAdapter } from '@ng-bootstrap/ng-bootstrap';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { DaterangepickerDirective, NgxDaterangepickerMd } from 'ngx-daterangepicker-material';
import { NgbDateCarbonAdapter } from '@directives/ngb-date.adapter';
import { GlobalService } from '@models/global.service';
import { Vacation } from '@models/vacation/vacation.model';
import { VacationService } from '@models/vacation/vacation.service';

type TimePeriod = NonNullable<DaterangepickerDirective['value']>;

interface SickNoteForm {
    period: TimePeriod | null;
    hasESickNote: boolean;
}

const EMPTY_SICK_NOTE: SickNoteForm = { period: null, hasESickNote: false };

const sickNoteSchema = schema<SickNoteForm>((sickNote) => {
    required(sickNote.period, { message: $localize`:@@i18n.profile.sickPeriodRequired:please pick the period you were sick` });
});

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'profile-sick-note',
    templateUrl: './profile-sick-note.component.html',
    providers: [{ provide: NgbDateAdapter, useClass: NgbDateCarbonAdapter }],
    imports: [EmptyStateComponent, FormField, NgxDaterangepickerMd],
})
export class ProfileSickNoteComponent {
    global = inject(GlobalService);
    #vacationService = inject(VacationService);

    #model = signal<SickNoteForm>({ ...EMPTY_SICK_NOTE });
    readonly sickNote = form(this.#model, sickNoteSchema);

    formHasBeenSent = signal(false);

    onSendSickNote() {
        void submit(this.sickNote, async (field) => {
            const { period, hasESickNote } = field().value();
            const payload = Vacation.fromJson({
                started_at: period?.startDate?.format?.('YYYY-MM-DD') ?? period?.startDate,
                ended_at: period?.endDate?.format?.('YYYY-MM-DD') ?? period?.endDate,
                state: Vacation.STATE_SICK,
                comment: hasESickNote ? $localize`:@@i18n.profile.eSickNote:electronic sick note` : $localize`:@@i18n.profile.pSickNote:printed sick note`,
            });
            this.formHasBeenSent.set(true);
            this.#vacationService.storeSickNote(payload).subscribe();
        });
    }

    onResetForm() {
        this.sickNote().reset({ ...EMPTY_SICK_NOTE });
        this.formHasBeenSent.set(false);
    }
}
