import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Nx } from '@app/nx/nx.directive';
import { GlobalService } from '@models/global.service';
import { LeadSource } from '@models/project/lead-source.model';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { InputModalService } from '@app/_modals/modal-input/modal-input.service';

@Component({
    selector: 'settings-projects-leads',
    templateUrl: './settings-projects-leads.component.html',
    imports: [EmptyStateComponent, Nx],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsProjectsLeadsComponent {
    global = inject(GlobalService);

    #input = inject(InputModalService);

    onNewSource() {
        this.#input.open('Please enter the name of the new source').then((response) => {
            if (response) {
                LeadSource.fromJson({}).store({ name: response.text }).subscribe((created) => this.global.lead_sources.update((sources) => [...sources, created]));
            }
        });
    }
}
