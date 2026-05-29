import { ChangeDetectionStrategy, Component, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DatePipe } from '@angular/common';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { forkJoin } from 'rxjs';
import { tracked } from '@constants/tracked';
import { Company } from '@models/company/company.model';
import { MarketingProspectActivity } from '@models/marketing/marketing-prospect-activity.model';
import { MarketingService } from '@models/marketing/marketing.service';
import { ModalBaseService } from '@app/_modals/modal-base-service';
import { Nx } from '@app/nx/nx.directive';
import { AvatarComponent } from '@app/_shards/avatar/avatar.component';
import { CustomerAddToInitiativeModalComponent } from './customer-add-to-initiative-modal/customer-add-to-initiative-modal.component';

@Component({
    selector: 'customer-initiatives',
    standalone: true,
    templateUrl: './customer-initiatives.component.html',
    imports: [RouterModule, NgbTooltipModule, DatePipe, Nx, AvatarComponent, AvatarComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerInitiativesComponent {
    readonly companyIn = input.required<Company>({ alias: 'company' });
    readonly company = tracked(this.companyIn);

    activityRows = signal<MarketingProspectActivity[]>([]);

    #marketingService = inject(MarketingService);
    #modalService = inject(ModalBaseService);

    constructor() {
        effect(() => {
            if (this.companyIn().id) untracked(() => this.#load());
        });
    }

    #load() {
        this.#marketingService.indexProspects({ company_id: this.companyIn().id }).subscribe((prospects: any[]) => {
            const rows: MarketingProspectActivity[] = [];
            for (const prospect of prospects) {
                for (const activity of prospect.activities ?? []) {
                    if (activity.status === 'pending' || activity.status === 'overdue') {
                        activity.marketing_prospect = prospect;
                        rows.push(activity);
                    }
                }
            }
            this.activityRows.set(rows.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()));
        });
    }

    statusIcon = (status: string) => status === 'overdue' ? 'warning' : 'schedule';
    statusClass = (status: string) => status === 'overdue' ? 'text-danger' : 'text-primary';

    openAddModal() {
        this.#modalService
            .open(CustomerAddToInitiativeModalComponent, { company: this.company })
            .then((result: any) => {
                if (!result?.contact_ids?.length) return;
                const calls = result.contact_ids.map((cid: string) => {
                    const contact = this.company().employees?.find((e) => e.id === cid);
                    return this.#marketingService.storeProspect({
                        marketing_initiative_id: result.initiative_id,
                        company_contact_id: cid,
                        company_id: this.company().id,
                        name: contact?.getName,
                        status: 'new',
                        added_via: 'manual',
                    });
                });
                forkJoin(calls).subscribe(() => this.#load());
            })
            .catch(() => { /* noop */ });
    }
}
