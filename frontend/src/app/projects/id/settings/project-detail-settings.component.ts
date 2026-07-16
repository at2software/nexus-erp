import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ProjectDetailGuard } from '@app/projects/project-details.guard';
import { RouterModule } from '@angular/router';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'project-detail-settings',
    imports: [RouterModule],
    templateUrl: './project-detail-settings.component.html',
})
export class ProjectDetailSettingsComponent {
    parent = inject(ProjectDetailGuard);
}
