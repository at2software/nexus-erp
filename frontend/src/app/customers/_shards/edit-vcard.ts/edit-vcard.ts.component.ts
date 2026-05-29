import { ChangeDetectionStrategy, Component, computed, inject, model, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CompanyContact } from '@models/company/company-contact.model';
import { CompanyContactService } from '@models/company/company-contact.service';
import { VcardComponent } from '../vcard/vcard.component';
import { Company } from '@models/company/company.model';
import { CustomerDetailGuard } from '@app/customers/customers.details.guard';
import { SearchInputComponent } from '@shards/search-input/search-input.component';
import { Nx } from '@app/nx/nx.directive';
import { AvatarComponent } from '@shards/avatar/avatar.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'edit-vcard',
    templateUrl: './edit-vcard.ts.component.html',
    styleUrls: ['./edit-vcard.ts.component.scss'],
    standalone: true,
    imports: [VcardComponent, SearchInputComponent, Nx, AvatarComponent],
})
export class EditVcardTsComponent implements OnInit, OnDestroy {
    card = model.required<CompanyContact>();

    fnRow = computed(() => this.card().contact.card()?.rows.findIndex((_) => _.key == 'FN'));
    nRow = computed(() => this.card().contact.card()?.rows.findIndex((_) => _.key == 'N'));
    searchQuery = '';

    #router = inject(ActivatedRoute);
    #parent = inject(CustomerDetailGuard);
    #companyContactService = inject(CompanyContactService);

    ngOnInit() {
        const object = this.#parent.object();
        this.#router.params.subscribe((params) => {
            const card = object.employees.find((_) => _.id == params['cid']);
            if (card) {
                this.card.set(card);
                setTimeout(() => (object.var.selectedEmployee = this.card));
            }
        });
    }

    ngOnDestroy() {
        const object = this.#parent.object();
        if (object.var) {
            object.var.selectedEmployee = undefined;
        }
    }

    onCompanySelect(company: Company) {
        if (this.card().company_id !== company.id) {
            this.searchQuery = '';
            this.#companyContactService
                .store({
                    company_id: company.id,
                    contact_id: this.card().contact_id,
                    vcard: 'TEL:\nEMAIL:\nTEL;type=cell:\nTITLE:',
                })
                .subscribe((response: any) => {
                    this.card().contact.companies.push(Company.fromJson(response.company));
                });
        }
    }

    onUnlink(company: Company) {
        this.card().contact.companies.remove(company);
        this.#companyContactService.unlink(this.card().contact_id, company.id).subscribe();
    }

    save() {
        const card = this.card();
        card.update({ vcard: card.__vcardExchangeString }).subscribe();
        if (card instanceof CompanyContact) {
            card.contact.update({ vcard: card.contact.__vcardExchangeString }).subscribe();
        }
    }

    updateVcard() {
        const contact = this.card().contact;
        contact.update({ vcard: contact.card()?.toString() }).subscribe();
    }
}
