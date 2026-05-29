import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Project } from '@models/project/project.model';
import { BaseWidgetComponent, WidgetOptions } from '../base.widget.component';
import { WidgetsModule } from '../widgets.module';
import { PermissionsDirective } from '@directives/permissions.directive';
import { WidgetService } from '@models/widget.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'widget-project-acquisitions',
    templateUrl: './widget-project-acquisitions.component.html',
    styleUrls: ['./widget-project-acquisitions.component.scss', './../base.widget.component.scss'],
    standalone: true,
    imports: [WidgetsModule, PermissionsDirective],
})
export class WidgetProjectAcquisitionsComponent extends BaseWidgetComponent {
    data = signal<Project[]>([]);
    chartData = signal<any>(undefined);
    #widgetService = inject(WidgetService);

    defaultOptions = () => ({
        ...WidgetOptions.maxItems,
        ...WidgetOptions.onlyMine,
        ...WidgetOptions.onlyMineAsPm,
        ...WidgetOptions.chartOnly,
    });

    reload(): void {
        const options = { ...this.getOptionsURI() };
        if (this.hasInvoicesModule) options['withChart'] = '1';
        this.#widgetService.indexCashflow('PROJECTS_ACQUISITIONS', options, Project).subscribe((response: any) => {
            const data = (response.objects || []).sort((a: any, b: any) => b.net - a.net);
            this.data.set(data);
            this.value.set(data.reduce((a: any, b: any) => a + b.net, 0));
            this.chartData.set(response.history);
        });
    }

    getProbabilityTooltip = (project: Project) =>
        $localize`:@@i18n.common.probability:probability` + ': ' + ((project.lead_probability || 0) * 100).toFixed(1) + '%';
}
