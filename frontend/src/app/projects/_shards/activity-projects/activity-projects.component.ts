import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { Company } from '@models/company/company.model';
import { Project } from '@models/project/project.model';
import { ProjectService } from '@models/project/project.service';
import { Nx } from '@app/nx/nx.directive';
import { ProjectComponent } from '@shards/project/project.component';
import { ProjectState } from '@models/project/project-state.model';
import { tracked } from '@constants/tracked';

@Component({
    selector: 'activity-projects',
    templateUrl: './activity-projects.component.html',
    imports: [Nx, ProjectComponent, ProjectComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityProjectsComponent {
    readonly project = input<Project | undefined>(undefined);
    readonly trackedProject = tracked(this.project);
    readonly company = input<Company | undefined>(undefined);
    readonly trackedCompany = tracked(this.company);

    pp = signal<Project[]>([]);

    #ps = inject(ProjectService);

    constructor() {
        const company = this.company();
        if (company) {
            const preparedOrRunningStates = [...ProjectState.idsPrepared(), ...ProjectState.idsRunning()];
            const payload = { company_id: company.id, state: preparedOrRunningStates };
            this.#ps.indexPaginated(payload).subscribe((x) => this.pp.set(x.data));
        }
    }
}
