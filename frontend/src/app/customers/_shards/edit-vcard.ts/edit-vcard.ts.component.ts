import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, model } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { CompanyContact } from '@models/company/company-contact.model';
import { CompanyContactService } from '@models/company/company-contact.service';
import { VcardComponent } from '../vcard/vcard.component';
import { Company } from '@models/company/company.model';
import { Serializable } from '@models/serializable';
import { CustomerDetailGuard } from '@app/customers/customers.details.guard';
import { SearchInputComponent } from '@shards/search-input/search-input.component';
import { Nx } from '@app/nx/nx.directive';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { CompanyContactStoreResponse } from '@models/api-response';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'edit-vcard',
    templateUrl: './edit-vcard.ts.component.html',
    imports: [VcardComponent, SearchInputComponent, Nx, AvatarComponent],
})
export class EditVcardTsComponent {
    card = model.required<CompanyContact>();

    fnRow = computed(() => this.card().contact.card()?.rows.findIndex((_) => _.key == 'FN'));
    nRow = computed(() => this.card().contact.card()?.rows.findIndex((_) => _.key == 'N'));
    searchQuery = '';

    #router = inject(ActivatedRoute);
    #parent = inject(CustomerDetailGuard);
    #companyContactService = inject(CompanyContactService);
    #destroyRef = inject(DestroyRef);

    constructor() {
        const object = this.#parent.object();
        this.#router.params.pipe(takeUntilDestroyed()).subscribe((params) => {
            const card = object.employees.find((_) => _.id == params['cid']);
            if (card) {
                this.card.set(card);
                setTimeout(() => {
                    object.var.selectedEmployee = this.card;
                    this.#parent.touch();
                });
            }
        });
        this.#destroyRef.onDestroy(() => {
            const current = this.#parent.object();
            if (current.var) {
                current.var.selectedEmployee = undefined;
                this.#parent.touch();
            }
        });
    }

    onCompanySelect(selected: Serializable) {
        const company = selected.assert(Company);
        if (!company) return;
        if (this.card().company_id !== company.id) {
            this.searchQuery = '';
            this.#companyContactService
                .store<CompanyContactStoreResponse>({
                    company_id: company.id,
                    contact_id: this.card().contact_id,
                    vcard: 'TEL:\nEMAIL:\nTEL;type=cell:\nTITLE:',
                })
                .subscribe((response) => {
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
