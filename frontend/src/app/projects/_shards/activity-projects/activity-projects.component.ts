import { Component, inject, input, OnInit } from '@angular/core';
import { Company } from 'src/models/company/company.model';
import { Project } from 'src/models/project/project.model';
import { ProjectService } from 'src/models/project/project.service';

import { NexusModule } from '@app/nx/nexus.module';
import { ProjectComponent } from '@shards/project/project.component';
import { ProjectState } from '@models/project/project-state.model';

@Component({
    selector: 'activity-projects',
    templateUrl: './activity-projects.component.html',
    styleUrls: ['./activity-projects.component.scss'],
    standalone: true,
    imports: [NexusModule, ProjectComponent]
})
export class ActivityProjectsComponent implements OnInit {
    project = input<Project|undefined>();
    company = input<Company|undefined>();

    pp?: Project[]
    #ps = inject(ProjectService)

    ngOnInit(): void {
        const company = this.company()
        if (company) {
            const preparedOrRunningStates = [...ProjectState.idsPrepared(), ...ProjectState.idsRunning()]
            this.#ps.index({ company_id: company.id, state: preparedOrRunningStates }).subscribe((x:any) => this.pp = x.data)
        }
    }
}
