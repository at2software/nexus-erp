import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalBaseComponent } from '@app/_modals/modal-base.component';
import { SearchService } from '@models/search.service';
import { MarketingProspect } from '@models/marketing/marketing.prospect.model';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { AvatarComponent } from '@app/_shards/avatar/avatar.component';
import { CompanyContact } from '@models/company/company-contact.model';
import { Contact } from '@models/company/contact.model';
import { Dictionary, REFLECTION } from '@constants/constants';
import { SpinnerComponent } from '@shards/spinner/spinner.component';
import { Serializable } from '@models/serializable';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'marketing-link-contact-modal',
    templateUrl: './marketing-link-contact-modal.component.html',
    styleUrls: ['./marketing-link-contact-modal.component.scss'],
    imports: [FormsModule, ScrollbarComponent, AvatarComponent, SpinnerComponent],
})
export class MarketingLinkContactModalComponent extends ModalBaseComponent<{ company_contact_id: string } | null> {
    prospect!: MarketingProspect;
    searchQuery = signal('');
    contactResults = signal<CompanyContact[]>([]);
    selectedContact = signal<CompanyContact | null>(null);
    isLoading = signal(false);

    #searchService = inject(SearchService);
    #searchDelay: ReturnType<typeof setTimeout> | undefined;

    init(args: { prospect: MarketingProspect }): void {
        this.prospect = args.prospect;
        // Pre-fill search with prospect name
        if (this.prospect.getName()) {
            this.searchQuery.set(this.prospect.getName());
            this.#searchContacts();
        }
    }

    onSearchInput() {
        if (this.#searchDelay) clearTimeout(this.#searchDelay);

        if (this.searchQuery().length >= 2) {
            this.#searchDelay = setTimeout(() => this.#searchContacts(), 300);
        } else {
            this.contactResults.set([]);
        }
    }

    #searchContacts() {
        this.isLoading.set(true);
        this.#searchService.search(this.searchQuery(), { only: 'Contact,CompanyContact' }).subscribe({
            next: (results: Dictionary) => {
                const reflected = Object.values(results).map((x) => REFLECTION<Serializable>(x));
                const contacts: CompanyContact[] = [];

                // Process results - could be Contact or CompanyContact objects
                for (const item of reflected) {
                    if (item instanceof CompanyContact) {
                        contacts.push(item);
                    } else if (item instanceof Contact && item.company_contacts?.length) {
                        // Add all company_contacts from this Contact
                        contacts.push(...item.company_contacts);
                    }
                }

                this.contactResults.set(contacts);
                this.isLoading.set(false);
            },
            error: () => {
                this.isLoading.set(false);
                this.contactResults.set([]);
            },
        });
    }

    selectContact(contact: CompanyContact) {
        this.selectedContact.set(contact);
    }

    onSuccess() {
        if (this.selectedContact()) {
            return {
                company_contact_id: this.selectedContact()!.id,
            };
        }
        return null;
    }
}
