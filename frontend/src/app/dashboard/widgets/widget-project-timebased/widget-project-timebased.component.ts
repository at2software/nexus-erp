import { Component, inject, OnInit } from '@angular/core';
import { Project } from 'src/models/project/project.model';
import { BaseWidgetComponent } from '../base.widget.component';
import { OptionType } from '../widget-options/widget-options.component';
import { GlobalService } from '@models/global.service';
import { WidgetsModule } from '../widgets.module';
import { ShortPipe } from 'src/pipes/short.pipe';
import { PermissionsDirective } from '@directives/permissions.directive';
import { WidgetService } from '@models/widget.service';

@Component({
    selector: 'widget-project-timebased',
    templateUrl: './widget-project-timebased.component.html',
    styleUrls: ['./widget-project-timebased.component.scss', './../base.widget.component.scss'],
    standalone: true,
    imports: [WidgetsModule, ShortPipe, PermissionsDirective]
})
export class WidgetProjectTimebasedComponent extends BaseWidgetComponent implements OnInit {

    data: Project[] = []
    max: number = 1
    chartData: any = undefined
    #widgetService = inject(WidgetService)
    global = inject(GlobalService)

    defaultOptions = () => ({
        'max-items': {type: OptionType.Number, value: 999, i18n: $localize`:@@i18n.common.maxItems:max items`},
        'only-mine': {type: OptionType.Boolean, value: false, i18n: $localize`:@@i18n.common.onlyMine:only mine`},
        'only-mine-as-pm': {type: OptionType.Boolean, value: false, i18n: $localize`:@@i18n.common.onlyMineAsProjectManager:only mine as project manager`},
        'chart-only': {type: OptionType.Boolean, value: false, i18n: $localize`:@@i18n.common.chartOnly:chart only`}
    })

    ngOnInit() {
        this.reload()
    }
    reload(): void {
        this.#widgetService.indexCashflow('PROJECTS_TIMEBASED', { ...this.getOptionsURI(), withChart: '1' }, Project)
            .subscribe((response: any) => {
                const data = response.objects || []
                this.max = Math.max(1, ...data.map((x: any) => x.uninvoiced_hours ?? 0))
                const d = data.sort((a: any, b: any) => b.uninvoiced_hours! - a.uninvoiced_hours!)
                d.forEach((_: any) => _.var.hidden = _.uninvoiced_hours == 0)
                this.data = d
                this.value = this.data.reduce((a: any, b: any) => a + (b.uninvoiced_hours ?? 0) ,0)
                this.chartData = response.history
            })
    }
}
