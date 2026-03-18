import { Component, inject } from '@angular/core';
import { ProjectDetailGuard } from '@app/projects/project-details.guard';
import { MediaPreviewComponent } from './media-preview/media-preview.component';

@Component({
    selector: 'project-media',
    templateUrl: './project-media.component.html',
    styleUrls: ['./project-media.component.scss'],
    standalone: true,
    imports: [MediaPreviewComponent]
})
export class ProjectMediaComponent {
    parent = inject(ProjectDetailGuard)
}
