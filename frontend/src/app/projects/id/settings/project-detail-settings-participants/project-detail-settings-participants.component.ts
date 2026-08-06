import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ProjectDetailGuard } from '@app/projects/project-details.guard';
import { ProjectService } from '@models/project/project.service';
import { modelListResource } from '@models/http/model-resource';
import { ConnectionsListComponent } from '@shards/connections-list/connections-list.component';
import { Connection } from '@models/company/connection.model';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { SpinnerComponent } from '@shards/spinner/spinner.component';
import { ParticipatingCompanyDto } from '@models/_core/api-response';
import { Nx } from '@app/nx/nx.directive';
import { StackedTableDirective } from '@directives/stacked-table.directive';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'project-detail-settings-participants',
    templateUrl: './project-detail-settings-participants.component.html',
    styleUrls: ['./project-detail-settings-participants.component.scss'],
    imports: [StackedTableDirective, RouterModule, ConnectionsListComponent, AvatarComponent, NgbTooltipModule, EmptyStateComponent, SpinnerComponent, Nx],
})
export class ProjectDetailSettingsParticipantsComponent {
    private readonly connectionsList = viewChild(ConnectionsListComponent);

    parent = inject(ProjectDetailGuard);
    #projectService = inject(ProjectService);

    readonly #participants = modelListResource(
        () => this.parent.object()?.id || undefined,
        (projectId) => this.#projectService.indexConnectionProjects(projectId),
    );
    readonly participants = this.#participants.value;
    readonly loading = this.#participants.isLoading;

    addConnection(connection: Connection) {
        const object = this.parent.object();
        this.#projectService.storeConnectionProject(object, Number(connection.id)).subscribe({
            next: () => {
                this.#participants.reload();
                this.connectionsList()?.reload();
            },
        });
    }

    removeParticipant(participant: ParticipatingCompanyDto) {
        const object = this.parent.object();
        this.#projectService.destroyConnectionProject(object, participant.id).subscribe({
            next: () => this.#participants.reload(),
        });
    }
}
