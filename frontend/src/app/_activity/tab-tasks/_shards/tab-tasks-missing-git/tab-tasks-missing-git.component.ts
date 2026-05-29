import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
    standalone: true,
    imports: [Nx, NComponent, AvatarComponent, RouterModule],
})
export class TabTasksMissingGitComponent extends TabTasksBaseComponent {
    data = signal<Project[]>([]);

    readonly #collapsed = signal<Set<string>>(new Set());
    toggle = (key: string) => this.#collapsed.update(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });
    isCollapsed = (key: string) => this.#collapsed().has(key);

    #projectService = inject(ProjectService);

    override ngOnInit() {
        super.ngOnInit();
        NxGlobal.broadcast$.pipe(
            filter(e => e.type === TBroadcast.Update && e.data instanceof Project && !!(e.data as Project).no_git_required),
        ).subscribe(e => {
            this.data.update(arr => arr.filter(p => p.id !== (e.data as Project).id));
        });
    }

    override reload() {
        this.#projectService.aget('projects/missing-git').subscribe((projects: any[]) => {
            this.data.set(projects);
        });
    }
}
