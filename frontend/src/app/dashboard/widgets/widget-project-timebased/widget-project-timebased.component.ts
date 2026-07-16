import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Project } from '@models/project/project.model';
import { BaseWidgetComponent, WidgetOptions } from '../base.widget.component';
import { WIDGET_SHARED } from '../widgets.shared';
import { ShortPipe } from '@pipes/short.pipe';
import { PermissionsDirective } from '@directives/permissions.directive';
import { WidgetService } from '@models/widget.service';
import { ParamChartSeries } from '@models/api-response';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'widget-project-timebased',
    templateUrl: './widget-project-timebased.component.html',
    styleUrls: ['./../base.widget.component.scss'],
    imports: [...WIDGET_SHARED, ShortPipe, PermissionsDirective],
})
export class WidgetProjectTimebasedComponent extends BaseWidgetComponent {
    data = signal<Project[]>([]);
    max = signal(1);
    chartData = signal<ParamChartSeries[] | undefined>(undefined);
    #widgetService = inject(WidgetService);

    defaultOptions = () => ({
        ...WidgetOptions.maxItems,
        ...WidgetOptions.onlyMine,
        ...WidgetOptions.onlyMineAsPm,
        ...WidgetOptions.chartOnly,
    });

    reload(): void {
        this.#widgetService.indexCashflow('PROJECTS_TIMEBASED', { ...this.getOptionsURI(), withChart: '1' }, Project).subscribe((response) => {
            this.max.set(Math.max(1, ...response.objects.map((x) => x.uninvoiced_hours)));
            const sorted = response.objects.sort((a, b) => b.uninvoiced_hours - a.uninvoiced_hours);
            sorted.forEach((_) => (_.var.hidden = _.uninvoiced_hours == 0));
            this.data.set(sorted);
            this.value.set(sorted.reduce((a, b) => a + b.uninvoiced_hours, 0));
            this.chartData.set(response.history);
        });
    }
}
