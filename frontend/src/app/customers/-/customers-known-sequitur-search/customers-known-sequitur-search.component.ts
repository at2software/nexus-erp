import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Company } from '@models/company/company.model';
import { CompanyContact } from '@models/company/company-contact.model';
import { CompanyService } from '@models/company/company.service';
import { Serializable } from '@models/_core/serializable';
import { MarketingService } from '@models/marketing/marketing.service';
import { SearchInputComponent } from '@shards/search-input/search-input.component';
import { SpinnerComponent } from '@shards/spinner/spinner.component';
import { EMPTY, switchMap } from 'rxjs';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'customers-known-sequitur-search',
    templateUrl: './customers-known-sequitur-search.component.html',
    styleUrls: ['./customers-known-sequitur-search.component.scss'],
    imports: [SearchInputComponent, SpinnerComponent],
})
export class CustomersKnownSequiturSearchComponent {
    #route = inject(ActivatedRoute);
    #router = inject(Router);
    #companyService = inject(CompanyService);
    #marketingService = inject(MarketingService);

    number = signal<string | undefined>(undefined);

    constructor() {
        this.#route.params.pipe(takeUntilDestroyed()).subscribe((p) => {
            const number = 'id' in p ? String(p['id']).replace(/\D/g, '') : undefined;
            this.number.set(number);
            if (number) this.#dispatch(number);
        });
    }

    onSearchResultSelect(_: Serializable) {
        const asCompany = _.assert(Company);
        const asContact = _.assert(CompanyContact);
        if (asCompany) this.#openKnownSequitur(asCompany);
        if (asContact) this.#openKnownSequitur(asContact.company);
    }

    getKnownSeqUrl = (): string => `${window.location.origin}/customers/knownseq/`;

    #dispatch(number: string) {
        this.#companyService
            .getByPhone(number)
            .pipe(
                switchMap((company) => {
                    if (company?.id) {
                        this.#openKnownSequitur(company);
                        return EMPTY;
                    }
                    return this.#marketingService.getProspectByPhone(number);
                }),
            )
            .subscribe({
                next: (prospect) => {
                    if (prospect?.id) this.#router.navigate(['/marketing/prospects', prospect.id]);
                    else this.#openDraft(number);
                },
                error: () => this.#openDraft(number),
            });
    }

    #openDraft = (number: string) => this.#router.navigate(['/customers/knownseq/draft', number]);
    #openKnownSequitur = (c: Company) => this.#router.navigate(['/customers', c.id, 'knownseq']);
}
