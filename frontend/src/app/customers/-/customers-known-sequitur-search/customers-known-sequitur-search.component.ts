
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Company } from '@models/company/company.model';
import { CompanyService } from '@models/company/company.service';
import { VcardRow } from '@models/vcard/VcardRow';
import { InputModalService } from '@app/_modals/modal-input/modal-input.component';
import { SearchInputComponent } from '@shards/search-input/search-input.component';

@Component({
    selector: 'customers-known-sequitur-search',
    templateUrl: './customers-known-sequitur-search.component.html',
    styleUrls: ['./customers-known-sequitur-search.component.scss'],
    standalone: true,
    imports: [SearchInputComponent]
})
export class CustomersKnownSequiturSearchComponent implements OnInit {

    number: string | undefined
    #route = inject(ActivatedRoute)
    #companyService = inject(CompanyService)
    #inputModalService = inject(InputModalService)
    noCustomerFound: boolean = false


    ngOnInit() {
        this.#route.params.subscribe(_ => {
            this.number = ('id' in _) ? _['id'] : undefined
            if (this.number) {
                this.number = this.number.replace(/[^\0-9]/g, '')
                this.getCustomer()
            }
        })
    }

    onSearchResultSelect(_: any) {
        switch (_.class) {
            case 'Company': this.openKnownSequitur(_); break;
            case 'CompanyContact': this.openKnownSequitur(_.company); break;
        }
    }

    createCostumer = () => {
        this.#inputModalService.open($localize`:@@i18n.customers.company_name_or_url:Company name or URL`).confirmed(({ text }) => {
            this.#companyService.create(text).subscribe(_ => {
                this.setPhoneNumber(_)
            })
        })
    }
    setPhoneNumber = (c: Company) => {
        const row = VcardRow.fromString('TEL;type=work,CELL:' + this.number)
        if (row) {
            c.card.rows.push(row)
            c.update({ 'vcard': c.card.toString() }).subscribe((_) => {
                this.openKnownSequitur(_)
            })
        }
    }

    getCustomer() {
        this.#companyService.getByPhone(this.number!).subscribe(_ => {
            if (_ != null) {
                this.openKnownSequitur(_);
            } else {
                this.noCustomerFound = true;
            }

        });
    }

    linkExistingCompany = (company: Company) => {
        this.setPhoneNumber(company)
    }

    getKnownSeqUrl = (): string => {
        const baseUrl = window.location.origin
        return `${baseUrl}/customers/knownseq/`
    }

    openKnownSequitur = (c: Company) => {
        const url = `/customers/${c.id}/knownseq/`
        window.open(url, '_self')
    }
}
