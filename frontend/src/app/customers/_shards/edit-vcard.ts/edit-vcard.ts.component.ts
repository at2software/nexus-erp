import { Component, inject, Input, OnDestroy, OnInit, ViewChildren } from '@angular/core';
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

    @Input() card: CompanyContact;
    updateNameComponents:boolean = true
    fnRow:number = -1
    nRow:number = -1
    searchQuery:string = ''

    @ViewChildren(VcardComponent) vcards: any

    #router = inject(ActivatedRoute)
    #parent = inject(CustomerDetailGuard)
    #companyContactService = inject(CompanyContactService)

    ngOnInit(): void {
        this.#router.params.subscribe(_ => {
            const cid = _['cid']
            const card = this.#parent.current?.employees.find(_ => _.id == cid)
            if (card) {
                this.card = card
                this.card.contact.card?.rows.forEach((x, i:number) => {
                    if (x.key == 'FN') this.fnRow = i;
                    if (x.key == 'N') this.nRow = i;
                })
                setTimeout(() => this.#parent.current.var.selectedEmployee = this.card)
            }
        })
    }
    ngOnDestroy() {
        if(this.#parent?.current?.var){
            this.#parent.current.var.selectedEmployee = undefined
        }
    }
    onCompanySelect(company:Company) {
        if (this.card.company_id !== company.id) {
            this.searchQuery = ''
            this.#companyContactService.store({
                company_id: company.id,
                contact_id: this.card.contact_id,
                vcard: "TEL:\nEMAIL:\nTEL;type=cell:\nTITLE:"
            }).subscribe((response:any) => {
                this.card.contact.companies.push(Company.fromJson(response.company))
            })
        }
    }
    onUnlink(company:Company) {
        this.card.contact.companies.remove(company)
        this.#companyContactService.unlink(this.card.contact_id, company.id).subscribe()
    }

    save() {
        this.card.update({ vcard: this.card.__vcardExchangeString }).subscribe()
        if (this.card instanceof CompanyContact) {
            this.card.contact.update({ vcard: this.card.contact.__vcardExchangeString }).subscribe()
        }
    }
    updateVcard() {
        this.card.contact.update({'vcard': this.card.contact.card?.toString() }).subscribe()
    }

}
