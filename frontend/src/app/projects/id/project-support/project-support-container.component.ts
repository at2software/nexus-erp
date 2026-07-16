import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { tracked } from '@constants/tracked';
import { ProjectDetailGuard } from '@app/projects/project-details.guard';
import { ProjectSupportComponent } from './project-support.component';

@Component({
    selector: 'project-support-container',
    template: '@if (guard.object()) {<project-support [parent]="guard.object()" (parentReloadRequested)="guard.reload()"></project-support>}',
    imports: [ProjectSupportComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectSupportContainerComponent {
    guard = inject(ProjectDetailGuard);

    readonly object = tracked(this.guard.object);
}
