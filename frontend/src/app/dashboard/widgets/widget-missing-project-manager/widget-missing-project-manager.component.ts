import { Component, inject } from '@angular/core';
import { Project } from 'src/models/project/project.model';
import { ProjectService } from 'src/models/project/project.service';
import { BaseWidgetComponent } from '../base.widget.component';
import { OptionType } from '../widget-options/widget-options.component';
import { WidgetsModule } from '../widgets.module';
import { PermissionsDirective } from '@directives/permissions.directive';
import { ProjectState } from '@models/project/project-state.model';

@Component({
    selector: 'widget-missing-project-manager',
    templateUrl: './widget-missing-project-manager.component.html',
    styleUrls: ['./widget-missing-project-manager.component.scss', './../base.widget.component.scss'],
    standalone: true,
    imports: [WidgetsModule, PermissionsDirective]
})
export class WidgetMissingProjectManagerComponent extends BaseWidgetComponent {

    FILTERS = {
        missing_project_manager: true,
        states: [...ProjectState.idsPrepared(), ...ProjectState.idsRunning()]
    }

    data: Project[] = []
    #projectService = inject(ProjectService)

    defaultOptions = () => ({
        'max-items': {type: OptionType.Number, value: 999, i18n: $localize`:@@i18n.common.maxItems:max items`},
        'only-mine-as-pm': {type: OptionType.Boolean, value: false, i18n: $localize`:@@i18n.common.onlyMineAsProjectManager:only mine as project manager`}
    })

    override ngOnInit() {
        super.ngOnInit()
        this.reload()
    }

    reload(): void {
        this.#projectService.index(Object.assign({}, this.FILTERS, this.getOptionsURI())).subscribe((_: Project[]) => {
            this.data = _.sort((a, b) => `${a.company_id}`.localeCompare(`${b.company_id}`))
            this.value = this.data.length
        })
    }
}
