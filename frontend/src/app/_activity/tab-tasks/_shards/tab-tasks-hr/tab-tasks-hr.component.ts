import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { Nx } from '@app/nx/nx.directive';
import { ActionEmitterType } from '@app/nx/nx.directive';
import { Vacation } from '@models/vacation/vacation.model';
import { VacationService } from '@models/vacation/vacation.service';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { TabTasksBaseComponent } from '../tab-tasks-base.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'tab-tasks-hr',
    templateUrl: './tab-tasks-hr.component.html',
    imports: [Nx, NgbTooltipModule, DatePipe],
})
export class TabTasksHrComponent extends TabTasksBaseComponent {
    vacationRequests = signal<Vacation[]>([]);
    sickNotes = signal<Vacation[]>([]);

    #vacationService = inject(VacationService);

    override reload() {
        this.#vacationService
            .indexPendingRequests()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((_) => {
                this.vacationRequests.set(_);
                this.countChanged.emit(_.length + this.sickNotes().length);
            });
        this.#vacationService
            .indexSickNotes()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((_) => {
                this.sickNotes.set(_);
                this.countChanged.emit(this.vacationRequests().length + _.length);
            });
    }

    actionsResolved(e: ActionEmitterType) {
        if (e.object.nx instanceof Vacation) this.reload();
    }

    getPrepopulatedSickNoteMail(_: Vacation) {
        const to = this.global.setting('SICKNOTE_EMAIL_RECEIPIENT');
        const formatDate = (dateStr: string | undefined) => {
            if (!dateStr) return '';
            return new Date(dateStr).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });
        };
        let subject = this.global.setting('SICKNOTE_EMAIL_SUBJECT') || '';
        subject = subject.replace(/\[data\]/g, `${_.user?.getName() || ''} - ${formatDate(_.started_at)} to ${formatDate(_.ended_at)}`);
        subject = encodeURIComponent(subject);

        let body = this.global.setting('SICKNOTE_EMAIL_TEXT') || '';
        const decodeHtmlEntities = (text: string) => {
            const textarea = document.createElement('textarea');
            textarea.innerHTML = text;
            return textarea.value;
        };
        body = decodeHtmlEntities(body);
        body = body.replace(/\[data\]/g, `\nMitarbeiter:in: ${_.user?.getName() || 'N/A'}\nZeitraum: ${formatDate(_.started_at)} to ${formatDate(_.ended_at)}\n${_.comment ? `Kommentar: ${_.comment}` : ''}`);
        body = body.replace(/<br\s*\/?>/gi, '\n');
        body = body.replace(/<\/(div|p)>/gi, '\n\n');
        body = body.replace(/<(div|p)\s*[^>]*>/gi, '');
        body = body.replace(/<\/?[^>]+(>|$)/g, '');
        body = body.replace(/^\n+/, '');
        body = body.replace(/\n{3,}/g, '\n\n');
        body = encodeURIComponent(body);
        window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
    }
}
