import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { RouterModule } from '@angular/router';
import { Nx } from '@app/nx/nx.directive';
import { NComponent } from '@shards/n/n.component';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { Project } from '@models/project/project.model';
import { ProjectService } from '@models/project/project.service';
import { NxGlobal, TBroadcast } from '@app/nx/nx.global';
import { TabTasksBaseComponent } from '../tab-tasks-base.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'tab-tasks-missing-git',
    templateUrl: './tab-tasks-missing-git.component.html',
    imports: [Nx, NComponent, AvatarComponent, RouterModule],
})
export class TabTasksMissingGitComponent extends TabTasksBaseComponent {
    data = signal<Project[]>([]);

    #projectService = inject(ProjectService);

    constructor() {
        super();
        NxGlobal.broadcast$.pipe(
            takeUntilDestroyed(),
            filter(e => e.type === TBroadcast.Update && e.data instanceof Project && !!(e.data as Project).no_git_required),
        ).subscribe(e => {
            this.data.update(arr => arr.filter(p => p.id !== (e.data as Project).id));
        });
    }

    override reload() {
        this.#projectService.indexMissingGit().subscribe((projects) => this.data.set(projects));
    }
}
