import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Project } from '@models/project/project.model';
import { BaseWidgetComponent, WidgetOptions } from '../base.widget.component';
import { WIDGET_SHARED } from '../widgets.shared';
import { ProjectService } from '@models/project/project.service';
import { MlReliabilityDirective } from '@directives/ml-reliability.directive';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'widget-overrun-risk',
    templateUrl: './widget-overrun-risk.component.html',
    styleUrls: ['./../base.widget.component.scss'],
    imports: [...WIDGET_SHARED, MlReliabilityDirective],
})
export class WidgetOverrunRiskComponent extends BaseWidgetComponent {
    #projectService = inject(ProjectService);

    defaultOptions = () => ({
        ...WidgetOptions.maxItems,
    });

    readonly #overrunRisk = this.optionsResource(() => this.#projectService.indexOverrunRisk());
    readonly data = computed<Project[]>(() => this.#overrunRisk.value() ?? []);
    override value = this.headline(this.#overrunRisk, () => this.data().length);
}
