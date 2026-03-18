import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalBaseComponent } from '@app/_modals/modal-base.component';
import { SearchService } from '@models/search.service';
import { MarketingProspect } from '@models/marketing/marketing.prospect.model';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { AvatarComponent } from '@app/_shards/avatar/avatar.component';
import { CompanyContact } from '@models/company/company-contact.model';
import { Contact } from '@models/company/contact.model';
import { REFLECTION } from '@constants/constants';

@Component({
    selector: 'marketing-link-contact-modal',
    templateUrl: './marketing-link-contact-modal.component.html',
    styleUrls: ['./marketing-link-contact-modal.component.scss'],
    standalone: true,
    imports: [FormsModule, ScrollbarComponent, AvatarComponent]
})
export class MarketingLinkContactModalComponent extends ModalBaseComponent<{company_contact_id: string} | null> {

    prospect: MarketingProspect
    searchQuery: string = ''
    contactResults: CompanyContact[] = []
    selectedContact: CompanyContact | null = null
    isLoading: boolean = false

    #searchService = inject(SearchService)
    #searchDelay: any

    init(...args: any): void {
        this.prospect = args[0].prospect
        // Pre-fill search with prospect name
        if (this.prospect.name) {
            this.searchQuery = this.prospect.name
            this.#searchContacts()
        }
    }

    onSearchInput() {
        if (this.#searchDelay) clearTimeout(this.#searchDelay)

        if (this.searchQuery.length >= 2) {
            this.#searchDelay = setTimeout(() => this.#searchContacts(), 300)
        } else {
            this.contactResults = []
        }
    }

    #searchContacts() {
        this.isLoading = true
        this.#searchService.search(this.searchQuery, { only: 'Contact,CompanyContact' }).subscribe({
            next: (results: any) => {
                const reflected = Object.values(results).map((x: any) => REFLECTION(x))
                const contacts: CompanyContact[] = []
                
                // Process results - could be Contact or CompanyContact objects
                for (const item of reflected) {
                    if (item instanceof CompanyContact) {
                        contacts.push(item)
                    } else if (item instanceof Contact && item.company_contacts?.length) {
                        // Add all company_contacts from this Contact
                        contacts.push(...item.company_contacts)
                    }
                }
                
                this.contactResults = contacts
                this.isLoading = false
            },
            error: () => {
                this.isLoading = false
                this.contactResults = []
            }
        })
    }

    selectContact(contact: CompanyContact) {
        this.selectedContact = contact
    }

    onSuccess() {
        if (this.selectedContact) {
            return {
                company_contact_id: this.selectedContact.id
            }
        }
        return null
    }
}
