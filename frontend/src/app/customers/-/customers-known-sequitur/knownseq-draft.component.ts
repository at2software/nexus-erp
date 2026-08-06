import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Company } from '@models/company/company.model';
import { CompanyService } from '@models/company/company.service';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { SpinnerComponent } from '@shards/spinner/spinner.component';
import { of, switchMap } from 'rxjs';
import { CustomersKnownSequiturComponent } from './customers-known-sequitur.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'knownseq-draft',
    templateUrl: './knownseq-draft.component.html',
    imports: [ToolbarComponent, SpinnerComponent, CustomersKnownSequiturComponent],
})
export class KnownSequiturDraftComponent {
    #route = inject(ActivatedRoute);
    #router = inject(Router);
    #companyService = inject(CompanyService);

    draft = signal<Company | undefined>(undefined);
    callerNumber = signal('');

    constructor() {
        this.#route.params.pipe(takeUntilDestroyed()).subscribe((p) => {
            const number = ('number' in p ? String(p['number']) : '').replace(/\D/g, '');
            this.callerNumber.set(number);
            if (number) this.#openDraft(number);
        });
    }

    #openDraft(number: string) {
        this.#companyService
            .getOrCreateDraft(number)
            .pipe(
                switchMap((company) =>
                    company.employees?.length
                        ? of(company)
                        : this.#companyService.createEmployee(company.id).pipe(switchMap(() => this.#companyService.show(company.id))),
                ),
            )
            .subscribe((company) => this.draft.set(company));
    }

    keep() {
        const d = this.draft();
        if (!d) return;
        this.#companyService.keepDraft(d).subscribe(() => this.#router.navigate(['/customers', d.id, 'knownseq']));
    }

    discard() {
        const d = this.draft();
        if (!d) return;
        d.modalConfirm($localize`:@@i18n.knownseq.discard_caller:discard caller?`, $localize`:@@i18n.knownseq.discard_caller_confirm:Discard this caller and everything noted during the call?`)
            .then(() => this.#companyService.discardDraft(d).subscribe(() => this.#router.navigate(['/customers/knownseq'])))
            .catch(() => undefined);
    }
}
