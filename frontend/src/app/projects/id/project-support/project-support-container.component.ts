import { Component, inject } from '@angular/core';
import { ProjectDetailGuard } from '@app/projects/project-details.guard';
import { ProjectSupportComponent } from './project-support.component';

@Component({
    template: '@if (guard.current) {<project-support [parent]="guard.current"></project-support>}',
    standalone: true,
    imports: [ProjectSupportComponent]
})
export class ProjectSupportContainerComponent {
    guard = inject(ProjectDetailGuard)
}
