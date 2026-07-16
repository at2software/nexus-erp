import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Project } from '@models/project/project.model';
import { BaseWidgetComponent, WidgetOptions } from '../base.widget.component';
import { WIDGET_SHARED } from '../widgets.shared';
import { PermissionsDirective } from '@directives/permissions.directive';
import { WidgetService } from '@models/widget.service';
import { ParamChartSeries } from '@models/api-response';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'widget-project-running',
    templateUrl: './widget-project-running.component.html',
    styleUrls: ['./../base.widget.component.scss'],
    imports: [...WIDGET_SHARED, PermissionsDirective],
})
export class WidgetProjectRunningComponent extends BaseWidgetComponent {
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
        this.#widgetService.indexCashflow('PROJECTS', options, Project).subscribe((response) => {
            const data = response.objects.sort((a, b) => b.net_remaining - a.net_remaining);
            this.data.set(data);
            this.value.set(data.reduce((a, b) => a + b.net_remaining, 0));
            this.chartData.set(response.history);
        });
    }
}
