import { Component, OnInit, ViewChild, inject } from '@angular/core';

import { RouterModule } from '@angular/router';
import { ProjectDetailGuard } from '@app/projects/project-details.guard';
import { ProjectService } from 'src/models/project/project.service';
import { ConnectionsListComponent } from '@shards/connections-list/connections-list.component';
import { Connection } from 'src/models/company/connection.model';
import { Company } from 'src/models/company/company.model';
import { NexusModule } from '@app/nx/nexus.module';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';

interface ParticipatingCompany {
    id: number;
    connection_id: string;
    other_company: any;
    project_count: number;
}

@Component({
    selector: 'project-detail-settings-participants',
    templateUrl: './project-detail-settings-participants.component.html',
    styleUrls: ['./project-detail-settings-participants.component.scss'],
    standalone: true,
    imports: [RouterModule, ConnectionsListComponent, NexusModule, NgbTooltipModule, EmptyStateComponent]
})
export class ProjectDetailSettingsParticipantsComponent implements OnInit {

    @ViewChild(ConnectionsListComponent) connectionsList!: ConnectionsListComponent;

    parent = inject(ProjectDetailGuard);
    #projectService = inject(ProjectService);

    participants: ParticipatingCompany[] = [];
    loading: boolean = false;

    ngOnInit() {
        this.parent.onChange.subscribe(() => {
            this.loadParticipants();
        });
        this.loadParticipants();
    }

    loadParticipants() {
        if (!this.parent.current) return;

        this.loading = true;
        this.#projectService.indexConnectionProjects(this.parent.current).subscribe({
            next: (data: any) => {
                this.participants = (data as ParticipatingCompany[]).map(p => ({
                    ...p,
                    other_company: Company.fromJson(p.other_company)
                }));
                this.loading = false;
            },
            error: () => {
                this.loading = false;
            }
        });
    }

    addConnection(connection: Connection) {
        if (!this.parent.current) return;

        this.#projectService.storeConnectionProject(this.parent.current, Number(connection.id)).subscribe({
            next: () => {
                this.loadParticipants();
                if (this.connectionsList) {
                    this.connectionsList.reload();
                }
            }
        });
    }

    removeParticipant(participant: ParticipatingCompany) {
        if (!this.parent.current) return;

        this.#projectService.destroyConnectionProject(this.parent.current, participant.id).subscribe({
            next: () => {
                this.loadParticipants();
            }
        });
    }
}
