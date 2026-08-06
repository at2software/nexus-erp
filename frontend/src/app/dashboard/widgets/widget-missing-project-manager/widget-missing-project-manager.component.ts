import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Project } from '@models/project/project.model';
import { ProjectService } from '@models/project/project.service';
import { BaseWidgetComponent, WidgetOptions } from '../base.widget.component';
import { WIDGET_SHARED } from '../widgets.shared';
import { PermissionsDirective } from '@directives/permissions.directive';
import { ProjectState } from '@models/project/project-state.model';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'widget-missing-project-manager',
    templateUrl: './widget-missing-project-manager.component.html',
    styleUrls: ['./../base.widget.component.scss'],
    imports: [...WIDGET_SHARED, PermissionsDirective],
})
export class WidgetMissingProjectManagerComponent extends BaseWidgetComponent {
    readonly #FILTERS = {
        missing_project_manager: true,
        states: ProjectState.idsPreparedOrRunning(),
    };

    #projectService = inject(ProjectService);

    defaultOptions = () => ({
        ...WidgetOptions.maxItems,
        ...WidgetOptions.onlyMineAsPm,
    });

    readonly #projects = this.optionsResource((options) => this.#projectService.index({ ...this.#FILTERS, ...options }));
    readonly data = computed<Project[]>(() => [...(this.#projects.value() ?? [])].sort((a, b) => `${a.company_id}`.localeCompare(`${b.company_id}`)));
    override value = this.headline(this.#projects, () => this.data().length);
}
