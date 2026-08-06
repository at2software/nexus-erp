import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { ModalBaseComponent } from '@app/_modals/modal-base.component';
import { Company } from '@models/company/company.model';
import { CompanyContact } from '@models/company/company-contact.model';
import { MarketingInitiative } from '@models/marketing/marketing-initiative.model';
import { MarketingService } from '@models/marketing/marketing.service';
import { modelResource } from '@models/http/model-resource';
import { AvatarComponent } from '@app/_shards/avatar/avatar.component';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { SpinnerComponent } from '@shards/spinner/spinner.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'customer-add-to-initiative-modal',
    templateUrl: './customer-add-to-initiative-modal.component.html',
    imports: [FormsModule, NgbTooltipModule, AvatarComponent, ScrollbarComponent, SpinnerComponent],
})
export class CustomerAddToInitiativeModalComponent extends ModalBaseComponent<{ initiative_id: string; contact_ids: string[] } | null> {
    company!: Company;
    contacts: CompanyContact[] = [];
    selectedInitiativeId = signal('');
    selectedContactIds = signal(new Set<string>());

    #marketingService = inject(MarketingService);

    #initiatives = modelResource(() => this.#marketingService.indexInitiatives({ status: 'active', per_page: 100 }));
    initiatives = computed<MarketingInitiative[]>(() => this.#initiatives.value()?.data ?? []);
    isLoading = this.#initiatives.isLoading;

    init(args: { company: Company }): void {
        this.company = args.company;
        this.contacts = this.company.employees?.filter((c) => !c.is_retired) ?? [];
    }

    toggleContact(id: string) {
        this.selectedContactIds.update((s) => {
            const n = new Set(s);
            if (n.has(id)) n.delete(id); else n.add(id);
            return n;
        });
    }

    readonly isValid = computed(() => !!this.selectedInitiativeId() && this.selectedContactIds().size > 0);

    onSuccess() {
        if (!this.isValid()) return null;
        return { initiative_id: this.selectedInitiativeId(), contact_ids: [...this.selectedContactIds()] };
    }
}
