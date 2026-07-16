import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Project } from '@models/project/project.model';
import { BaseWidgetComponent, WidgetOptions } from '../base.widget.component';
import { WIDGET_SHARED } from '../widgets.shared';
import { PermissionsDirective } from '@directives/permissions.directive';
import { WidgetService } from '@models/widget.service';
import { ParamChartSeries } from '@models/api-response';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'widget-project-acquisitions',
    templateUrl: './widget-project-acquisitions.component.html',
    styleUrls: ['./../base.widget.component.scss'],
    imports: [...WIDGET_SHARED, PermissionsDirective],
})
export class WidgetProjectAcquisitionsComponent extends BaseWidgetComponent {
    data = signal<Project[]>([]);
    chartData = signal<ParamChartSeries[] | undefined>(undefined);
    #widgetService = inject(WidgetService);

    defaultOptions = () => ({
        ...WidgetOptions.maxItems,
        ...WidgetOptions.onlyMine,
        ...WidgetOptions.onlyMineAsPm,
        ...WidgetOptions.chartOnly,
    });

    reload(): void {
        const options = { ...this.getOptionsURI() };
        if (this.hasInvoicesModule()) options['withChart'] = '1';
        this.#widgetService.indexCashflow('PROJECTS_ACQUISITIONS', options, Project).subscribe((response) => {
            const data = response.objects.sort((a, b) => (b.net ?? 0) - (a.net ?? 0));
            this.data.set(data);
            this.value.set(data.reduce((a, b) => a + (b.net ?? 0), 0));
            this.chartData.set(response.history);
        });
    }

    getProbabilityTooltip = (project: Project) =>
        $localize`:@@i18n.common.probability:probability` + ': ' + ((project.lead_probability || 0) * 100).toFixed(1) + '%';
}
