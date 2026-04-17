import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalBaseComponent } from '@app/_modals/modal-base.component';
import { SearchService } from '@models/search.service';
import { MarketingProspect } from '@models/marketing/marketing.prospect.model';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { AvatarComponent } from '@app/_shards/avatar/avatar.component';
import { Company } from '@models/company/company.model';
import { REFLECTION } from '@constants/constants';

@Component({
    selector: 'marketing-convert-prospect-modal',
    templateUrl: './marketing-convert-prospect-modal.component.html',
    styleUrls: ['./marketing-convert-prospect-modal.component.scss'],
    standalone: true,
    imports: [FormsModule, ScrollbarComponent, AvatarComponent]
})
export class MarketingConvertProspectModalComponent extends ModalBaseComponent<{company_id?: string, create_new: boolean, company_name?: string}> {

    prospect: MarketingProspect
    searchQuery: string = ''
    companyResults: Company[] = []
    selectedCompany: Company | null = null
    isLoading: boolean = false
    createNew: boolean = false

    #searchService = inject(SearchService)
    #searchDelay: any

    init(...args: any): void {
        this.prospect = args[0].prospect
        // Pre-fill search with company name from prospect's vcard
        const companyFromVcard = this.prospect.card.get('ORG')?.map(_ => _.vals.join(' ')).join(', ')
        if (companyFromVcard) {
            this.searchQuery = companyFromVcard
            this.#searchCompanies()
        }
    }

    onSearchInput() {
        if (this.#searchDelay) clearTimeout(this.#searchDelay)

        if (this.searchQuery.length >= 2) {
            this.#searchDelay = setTimeout(() => this.#searchCompanies(), 300)
        } else {
            this.companyResults = []
        }
    }

    #searchCompanies() {
        this.isLoading = true
        this.#searchService.search(this.searchQuery, { only: 'Company' }).subscribe({
            next: (results: any) => {
                this.companyResults = Object.values(results).map((x: any) => REFLECTION(x) as Company)
                this.isLoading = false
            },
            error: () => {
                this.isLoading = false
                this.companyResults = []
            }
        })
    }

    selectCompany(company: Company) {
        this.selectedCompany = company
        this.createNew = false
    }

    selectCreateNew() {
        this.createNew = true
        this.selectedCompany = null
    }

    onSuccess() {
        if (this.createNew) {
            return {
                create_new: true,
                company_name: this.searchQuery
            }
        } else if (this.selectedCompany) {
            return {
                company_id: this.selectedCompany.id,
                create_new: false
            }
        }
        return {
            create_new: false
        }
    }
}
