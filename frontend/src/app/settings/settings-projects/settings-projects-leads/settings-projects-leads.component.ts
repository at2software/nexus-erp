
import { Component, inject } from '@angular/core';
import { NexusModule } from '@app/nx/nexus.module';
import { GlobalService } from '@models/global.service';
import { LeadSource } from '@models/project/lead_source.model';
import { LeadSourceService } from '@models/project/lead_source.service';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { InputModalService } from '@app/_modals/modal-input/modal-input.component';

@Component({
    selector: 'settings-projects-leads',
    templateUrl: './settings-projects-leads.component.html',
    styleUrls: ['./settings-projects-leads.component.scss'],
    standalone: true,
    imports: [EmptyStateComponent, NexusModule]
})
export class SettingsProjectsLeadsComponent {
    global            = inject(GlobalService)
    leadSourceService = inject(LeadSourceService)
    #input            = inject(InputModalService)

    onNewSource() {
        this.#input.open('Please enter the name of the new source').then(response => {
            if (response) {
                this.leadSourceService.store(response.text).subscribe(_ => this.global.lead_sources.push(LeadSource.fromJson(_)))
            }
        })
    }
}
