import { Component, inject } from '@angular/core';
import { Project } from 'src/models/project/project.model';
import { BaseWidgetComponent, WidgetOptions } from '../base.widget.component';
import { WidgetsModule } from '../widgets.module';
import { PermissionsDirective } from '@directives/permissions.directive';
import { WidgetService } from '@models/widget.service';

@Component({
    selector: 'widget-project-running',
    templateUrl: './widget-project-running.component.html',
    styleUrls: ['./widget-project-running.component.scss', './../base.widget.component.scss'],
    standalone: true,
    imports: [WidgetsModule, PermissionsDirective]
})
export class WidgetProjectRunningComponent extends BaseWidgetComponent {

    data:Project[] = []
    chartData: any = undefined
    #widgetService = inject(WidgetService)

    defaultOptions = () => ({
        ...WidgetOptions.maxItems,
        ...WidgetOptions.onlyMine,
        ...WidgetOptions.onlyMineAsPm,
        ...WidgetOptions.chartOnly,
    })

    reload(): void {
        const options = { ...this.getOptionsURI() }
        if (this.hasInvoicesModule) {
            options['withChart'] = '1'
        }
        this.#widgetService.indexCashflow('PROJECTS', options, Project).subscribe((response: any) => {
            const _ = response.objects || []
            this.data = _.sort((a: any, b: any) => b.net_remaining - a.net_remaining)
            this.value = this.data.reduce((a: any, b: any) => a + b.net_remaining ,0)
            this.chartData = response.history
        })
    }
}
