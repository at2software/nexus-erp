import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { tracked } from '@constants/tracked';
import { ProjectDetailGuard } from '@app/projects/project-details.guard';
import { MediaPreviewComponent } from './media-preview/media-preview.component';

@Component({
    selector: 'project-media',
    templateUrl: './project-media.component.html',
    imports: [MediaPreviewComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectMediaComponent {
    parent = inject(ProjectDetailGuard);

    readonly object = tracked(this.parent.object);
}
