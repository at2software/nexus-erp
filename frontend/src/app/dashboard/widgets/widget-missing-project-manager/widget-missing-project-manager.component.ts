import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
        states: [...ProjectState.idsPrepared(), ...ProjectState.idsRunning()],
    };

    data = signal<Project[]>([]);
    #projectService = inject(ProjectService);

    defaultOptions = () => ({
        ...WidgetOptions.maxItems,
        ...WidgetOptions.onlyMineAsPm,
    });

    reload(): void {
        this.#projectService.index(Object.assign({}, this.#FILTERS, this.getOptionsURI())).subscribe((_: Project[]) => {
            this.data.set(_.sort((a, b) => `${a.company_id}`.localeCompare(`${b.company_id}`)));
            this.value.set(this.data().length);
        });
    }
}
