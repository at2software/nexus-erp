import { Component, inject } from '@angular/core';
import { ProjectDetailGuard } from '@app/projects/project-details.guard';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'project-detail-settings',
  imports: [RouterModule],
  templateUrl: './project-detail-settings.component.html',
  styleUrl: './project-detail-settings.component.scss'
})
export class ProjectDetailSettingsComponent {
    parent = inject(ProjectDetailGuard)
}
