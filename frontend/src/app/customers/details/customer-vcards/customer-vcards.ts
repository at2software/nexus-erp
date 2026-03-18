import { Component, inject } from '@angular/core';
import { CompanyService } from '@models/company/company.service';
import { CustomerDetailGuard } from '@app/customers/customers.details.guard';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { ListGroupItemContactComponent } from '@app/customers/_shards/list-group-item-contact/list-group-item-contact.component';
import { NexusModule } from '@app/nx/nexus.module';
import { RouterModule } from '@angular/router';

import { NxComponent } from '@shards/nx/nx.component';
import { FormsModule } from '@angular/forms';
import { AutosaveDirective } from '@directives/autosave.directive';
import { VcardComponent } from '@app/customers/_shards/vcard/vcard.component';
import { At2connect } from '@app/customers/_shards/at2connect/at2connect';
import { GlobalService } from '@models/global.service';

@Component({
    selector: 'customer-vcards',
    templateUrl: './customer-vcards.html',
    styleUrls: ['./customer-vcards.scss'],
    standalone: true,
    imports: [ScrollbarComponent, ListGroupItemContactComponent, NexusModule, RouterModule, VcardComponent, NxComponent, FormsModule, AutosaveDirective, At2connect]
})
export class CustomerVcards {
    parent = inject(CustomerDetailGuard)
    global = inject(GlobalService)
    #companyService = inject(CompanyService)
    onAddEmployee = () => this.#companyService.createEmployee(this.parent.current.id).subscribe(() => this.parent.reload())
}
