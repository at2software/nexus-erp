import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { ModalBaseComponent } from '@app/_modals/modal-base.component';
import { Company } from '@models/company/company.model';
import { CompanyContact } from '@models/company/company-contact.model';
import { MarketingInitiative } from '@models/marketing/marketing-initiative.model';
import { MarketingService } from '@models/marketing/marketing.service';
import { AvatarComponent } from '@app/_shards/avatar/avatar.component';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';

@Component({
    selector: 'customer-add-to-initiative-modal',
    standalone: true,
    templateUrl: './customer-add-to-initiative-modal.component.html',
    imports: [FormsModule, NgbTooltipModule, AvatarComponent, ScrollbarComponent]
})
export class CustomerAddToInitiativeModalComponent extends ModalBaseComponent<{ initiative_id: string, contact_ids: string[] } | null> {

    company!: Company
    contacts: CompanyContact[] = []
    initiatives: MarketingInitiative[] = []
    selectedInitiativeId: string = ''
    selectedContactIds = new Set<string>()
    isLoading = true

    #marketingService = inject(MarketingService)

    init(...args: any): void {
        this.company = args[0].company
        this.contacts = this.company.employees?.filter(c => !c.is_retired) ?? []
        this.#marketingService.indexInitiatives({ status: 'active', per_page: 100 }).subscribe((r: any) => {
            this.initiatives = r.data
            this.isLoading = false
        })
    }

    toggleContact(id: string) {
        if (this.selectedContactIds.has(id)) this.selectedContactIds.delete(id)
        else this.selectedContactIds.add(id)
    }

    get isValid() {
        return !!this.selectedInitiativeId && this.selectedContactIds.size > 0
    }

    onSuccess() {
        if (!this.isValid) return null
        return { initiative_id: this.selectedInitiativeId, contact_ids: [...this.selectedContactIds] }
    }
}
