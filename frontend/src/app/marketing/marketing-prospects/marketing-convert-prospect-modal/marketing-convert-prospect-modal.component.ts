import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalBaseComponent } from '@app/_modals/modal-base.component';
import { SearchService } from '@models/search.service';
import { MarketingProspect } from '@models/marketing/marketing.prospect.model';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { AvatarComponent } from '@app/_shards/avatar/avatar.component';
import { Company } from '@models/company/company.model';
import { REFLECTION } from '@constants/constants';
import { SpinnerComponent } from '@shards/spinner/spinner.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'marketing-convert-prospect-modal',
    templateUrl: './marketing-convert-prospect-modal.component.html',
    styleUrls: ['./marketing-convert-prospect-modal.component.scss'],
    imports: [FormsModule, ScrollbarComponent, AvatarComponent, SpinnerComponent],
})
export class MarketingConvertProspectModalComponent extends ModalBaseComponent<{ company_id?: string; create_new: boolean; company_name?: string }> {
    prospect!: MarketingProspect;
    searchQuery = signal('');
    companyResults = signal<Company[]>([]);
    selectedCompany = signal<Company | null>(null);
    isLoading = signal(false);
    createNew = signal(false);

    #searchService = inject(SearchService);
    #searchDelay: ReturnType<typeof setTimeout> | undefined;

    init(args: { prospect: MarketingProspect }): void {
        this.prospect = args.prospect;
        // Pre-fill search with company name from prospect's vcard
        const companyFromVcard = this.prospect.card()
            ?.get('ORG')
            ?.map((_) => _.vals.join(' '))
            .join(', ');
        if (companyFromVcard) {
            this.searchQuery.set(companyFromVcard);
            this.#searchCompanies();
        }
    }

    onSearchInput() {
        if (this.#searchDelay) clearTimeout(this.#searchDelay);

        if (this.searchQuery().length >= 2) {
            this.#searchDelay = setTimeout(() => this.#searchCompanies(), 300);
        } else {
            this.companyResults.set([]);
        }
    }

    #searchCompanies() {
        this.isLoading.set(true);
        this.#searchService.search(this.searchQuery(), { only: 'Company' }).subscribe({
            next: (results) => {
                this.companyResults.set(Object.values(results).map((x) => REFLECTION<Company>(x)));
                this.isLoading.set(false);
            },
            error: () => {
                this.isLoading.set(false);
                this.companyResults.set([]);
            },
        });
    }

    selectCompany(company: Company) {
        this.selectedCompany.set(company);
        this.createNew.set(false);
    }

    selectCreateNew() {
        this.createNew.set(true);
        this.selectedCompany.set(null);
    }

    onSuccess() {
        if (this.createNew()) {
            return {
                create_new: true,
                company_name: this.searchQuery(),
            };
        } else if (this.selectedCompany()) {
            return {
                company_id: this.selectedCompany()!.id,
                create_new: false,
            };
        }
        return {
            create_new: false,
        };
    }
}
