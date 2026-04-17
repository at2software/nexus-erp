import { Component, computed, inject, model, OnDestroy, OnInit, ViewChildren } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CompanyContact } from 'src/models/company/company-contact.model';
import { CompanyContactService } from 'src/models/company/company-contact.service';
import { VcardComponent } from '../vcard/vcard.component';
import { Company } from 'src/models/company/company.model';
import { CustomerDetailGuard } from 'src/app/customers/customers.details.guard';
import { SearchInputComponent } from '@shards/search-input/search-input.component';
import { NexusModule } from '@app/nx/nexus.module';


@Component({
    selector: 'edit-vcard',
    templateUrl: './edit-vcard.ts.component.html',
    styleUrls: ['./edit-vcard.ts.component.scss'],
    standalone: true,
    imports: [VcardComponent, SearchInputComponent, NexusModule]
})
export class EditVcardTsComponent implements OnInit, OnDestroy {

    card = model.required<CompanyContact>()

    fnRow = computed(() => this.card().contact.card.rows.findIndex(_ => _.key == 'FN'))
    nRow  = computed(() => this.card().contact.card.rows.findIndex(_ => _.key == 'N'))
    searchQuery = ''

    @ViewChildren(VcardComponent) vcards: any

    #router = inject(ActivatedRoute)
    #parent = inject(CustomerDetailGuard)
    #companyContactService = inject(CompanyContactService)

    ngOnInit() {
        this.#router.params.subscribe(params => {
            const card = this.#parent.current?.employees.find(_ => _.id == params['cid'])
            if (card) {
                this.card.set(card)
                setTimeout(() => this.#parent.current.var.selectedEmployee = this.card)
            }
        })
    }

    ngOnDestroy() {
        if (this.#parent?.current?.var) {
            this.#parent.current.var.selectedEmployee = undefined
        }
    }

    onCompanySelect(company: Company) {
        if (this.card().company_id !== company.id) {
            this.searchQuery = ''
            this.#companyContactService.store({
                company_id: company.id,
                contact_id: this.card().contact_id,
                vcard: "TEL:\nEMAIL:\nTEL;type=cell:\nTITLE:"
            }).subscribe((response: any) => {
                this.card().contact.companies.push(Company.fromJson(response.company))
            })
        }
    }

    onUnlink(company: Company) {
        this.card().contact.companies.remove(company)
        this.#companyContactService.unlink(this.card().contact_id, company.id).subscribe()
    }

    save() {
        const card = this.card()
        card.update({ vcard: card.__vcardExchangeString }).subscribe()
        if (card instanceof CompanyContact) {
            card.contact.update({ vcard: card.contact.__vcardExchangeString }).subscribe()
        }
    }

    updateVcard() {
        const contact = this.card().contact
        contact.update({ vcard: contact.card.toString() }).subscribe()
    }
}
