import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ProjectDetailGuard } from '@app/projects/project-details.guard';
import { ProjectService } from '@models/project/project.service';
import { ConnectionsListComponent } from '@shards/connections-list/connections-list.component';
import { Connection } from '@models/company/connection.model';
import { Company } from '@models/company/company.model';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { SpinnerComponent } from '@shards/spinner/spinner.component';

interface ParticipatingCompany {
    id: number;
    connection_id: string;
    other_company: any;
    project_count: number;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'project-detail-settings-participants',
    templateUrl: './project-detail-settings-participants.component.html',
    styleUrls: ['./project-detail-settings-participants.component.scss'],
    standalone: true,
    imports: [RouterModule, ConnectionsListComponent, AvatarComponent, NgbTooltipModule, EmptyStateComponent, SpinnerComponent],
})
export class ProjectDetailSettingsParticipantsComponent {
    private readonly connectionsList = viewChild(ConnectionsListComponent);

    parent = inject(ProjectDetailGuard);
    #projectService = inject(ProjectService);

    participants: ParticipatingCompany[] = [];
    loading = signal(false);

    constructor() {
        effect(() => {
            this.parent.object();
            untracked(() => {
                this.loadParticipants();
            });
        });
    }

    loadParticipants() {
        const object = this.parent.object();
        this.loading.set(true);
        this.#projectService.indexConnectionProjects(object).subscribe({
            next: (data: any) => {
                this.participants = (data as ParticipatingCompany[]).map((p) => ({
                    ...p,
                    other_company: Company.fromJson(p.other_company),
                }));
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
            },
        });
    }

    addConnection(connection: Connection) {
        const object = this.parent.object();
        this.#projectService.storeConnectionProject(object, Number(connection.id)).subscribe({
            next: () => {
                this.loadParticipants();
                this.connectionsList()?.reload();
            },
        });
    }

    removeParticipant(participant: ParticipatingCompany) {
        const object = this.parent.object();
        this.#projectService.destroyConnectionProject(object, participant.id).subscribe({
            next: () => {
                this.loadParticipants();
            },
        });
    }
}
