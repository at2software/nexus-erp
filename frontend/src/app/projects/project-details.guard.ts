import { inject, Service } from '@angular/core';
import { IHasFociGuard } from '@models/focus/has-foci.interface';
import { DetailGuard } from '@guards/detail.guard';
import { Project } from '@models/project/project.model';
import { ProjectService } from '@models/project/project.service';

@Service()
export class ProjectDetailGuard extends DetailGuard<Project> implements IHasFociGuard {
    parent?: Project;
    service = inject(ProjectService);

    observable = (id: string) => this.service.show(id);

    onBeforeLoad() {
        this.parent = undefined;
    }
    async onLoaded(_: Project) {
        this.parent = _.parent_project;
    }
    setParent = (_?: Project) =>
        this.object().update({ project_id: _ ? _.id : null }).subscribe(() => {
            this.onLoaded(this.object());
            this.touch();
        });
}
