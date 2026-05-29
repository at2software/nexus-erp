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
    styleUrls: ['./activity-projects.component.scss'],
    standalone: true,
    imports: [Nx, ProjectComponent, ProjectComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityProjectsComponent {
    readonly projectIn = input<Project | undefined>(undefined, { alias: 'project' });
    readonly project = tracked(this.projectIn);
    readonly companyIn = input<Company | undefined>(undefined, { alias: 'company' });
    readonly company = tracked(this.companyIn);

    pp = signal<Project[]>([]);

    #ps = inject(ProjectService);

    constructor() {
        const company = this.companyIn();
        if (company) {
            const preparedOrRunningStates = [...ProjectState.idsPrepared(), ...ProjectState.idsRunning()];
            this.#ps.index({ company_id: company.id, state: preparedOrRunningStates }).subscribe((x: any) => this.pp.set(x.data));
        }
    }
}
