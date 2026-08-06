import { ChangeDetectionStrategy, Component, inject, linkedSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { modelListResource } from '@models/http/model-resource';
import { RouterModule } from '@angular/router';
import { Nx } from '@app/nx/nx.directive';
import { NComponent } from '@shards/n/n.component';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { Project } from '@models/project/project.model';
import { ProjectService } from '@models/project/project.service';
import { NxStatic, TBroadcast } from '@app/nx/nx.static';
import { TabTasksBaseComponent } from '../tab-tasks-base.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'tab-tasks-missing-git',
    templateUrl: './tab-tasks-missing-git.component.html',
    imports: [Nx, NComponent, AvatarComponent, RouterModule],
})
export class TabTasksMissingGitComponent extends TabTasksBaseComponent {
    #projectService = inject(ProjectService);

    #data = modelListResource(this.ready, () => this.#projectService.indexMissingGit());
    data = linkedSignal(() => this.#data.value());

    constructor() {
        super();
        NxStatic.broadcast$.pipe(
            takeUntilDestroyed(),
            filter(e => e.type === TBroadcast.Update && e.data instanceof Project && !!(e.data as Project).no_git_required),
        ).subscribe(e => {
            this.data.update(arr => arr.filter(p => p.id !== (e.data as Project).id));
        });
    }

    override reload() {
        this.#data.reload();
    }
}
