import { Component, inject } from '@angular/core';
import { Project } from 'src/models/project/project.model';
import { ProjectService } from 'src/models/project/project.service';
import { BaseWidgetComponent, WidgetOptions } from '../base.widget.component';
import { WidgetsModule } from '../widgets.module';

@Component({
    selector: 'widget-missing-git',
    templateUrl: './widget-missing-git.component.html',
    styleUrls: ['./widget-missing-git.component.scss', './../base.widget.component.scss'],
    standalone: true,
    imports: [WidgetsModule]
})
export class WidgetMissingGitComponent extends BaseWidgetComponent {

    data: Project[] = []
    #projectService = inject(ProjectService)

    defaultOptions = () => ({ ...WidgetOptions.maxItems })

    reload(): void {
        this.#projectService.aget('projects/missing-git').subscribe((projects: any[]) => {
            this.data = projects
            this.value = this.data.length
        })
    }
}
