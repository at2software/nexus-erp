import { Component, inject } from '@angular/core';
import { Project } from 'src/models/project/project.model';
import { BaseWidgetComponent } from '../base.widget.component';
import { OptionType } from '../widget-options/widget-options.component';
import { WidgetsModule } from '../widgets.module';
import { PermissionsDirective } from '@directives/permissions.directive';
import { WidgetService } from '@models/widget.service';

@Component({
    selector: 'widget-project-acquisitions',
    templateUrl: './widget-project-acquisitions.component.html',
    styleUrls: ['./widget-project-acquisitions.component.scss', './../base.widget.component.scss'],
    standalone: true,
    imports: [WidgetsModule, PermissionsDirective]
})
export class WidgetProjectAcquisitionsComponent extends BaseWidgetComponent {

    data:Project[] = []
    chartData: any = undefined
    #widgetService = inject(WidgetService)

    defaultOptions = () => ({
        'max-items': {type:OptionType.Number, value:999, i18n: $localize`:@@i18n.common.maxItems:max items`},
        'only-mine': {type:OptionType.Boolean, value:false, i18n: $localize`:@@i18n.common.onlyMine:only mine`},
        'only-mine-as-pm': {type:OptionType.Boolean, value:false, i18n: $localize`:@@i18n.common.onlyMineAsProjectManager:only mine as project manager`},
        'chart-only': {type:OptionType.Boolean, value:false, i18n: $localize`:@@i18n.common.chartOnly:chart only`}
    })

    override ngOnInit () {
        super.ngOnInit()
        this.reload()
    }
    reload(): void {
        const options = { ...this.getOptionsURI() }
        if (this.hasInvoicesModule) {
            options['withChart'] = '1'
        }
        this.#widgetService.indexCashflow('PROJECTS_ACQUISITIONS', options, Project).subscribe((response: any) => {
            const _ = response.objects || []
            this.data = _.sort((a: any, b: any) => b.net - a.net)
            this.value = this.data.reduce((a: any, b: any) => a + b.net ,0)
            this.chartData = response.history
        })
    }

    getProbabilityTooltip = (project: Project): string => {
        const probability = ((project.lead_probability || 0) * 100).toFixed(1)
        return $localize`:@@i18n.common.probability:probability` + ': ' + probability + '%'
    }
}
