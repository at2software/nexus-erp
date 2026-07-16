import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Project } from '@models/project/project.model';
import { BaseWidgetComponent, WidgetOptions } from '../base.widget.component';
import { WIDGET_SHARED } from '../widgets.shared';
import { ProjectService } from '@models/project/project.service';
import { MlReliabilityDirective } from '@directives/ml-reliability.directive';

/**
 * Model 2 ("early warning") actionable output: running, budget-based
 * projects whose predicted final hours already exceed the quoted estimate,
 * ranked by predicted overrun ratio, highest risk first. All-ML card — see
 * frontend/CLAUDE.md's ML-UI convention: the local-ai icon + reliability
 * tooltip live once on the card header instead of being repeated per row.
 */
@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'widget-overrun-risk',
    templateUrl: './widget-overrun-risk.component.html',
    styleUrls: ['./../base.widget.component.scss'],
    imports: [...WIDGET_SHARED, MlReliabilityDirective],
})
export class WidgetOverrunRiskComponent extends BaseWidgetComponent {
    data = signal<Project[]>([]);
    #projectService = inject(ProjectService);

    defaultOptions = () => ({
        ...WidgetOptions.maxItems,
    });

    reload(): void {
        this.#projectService.indexOverrunRisk().subscribe((data) => {
            this.data.set(data);
            this.value.set(data.length);
        });
    }
}
