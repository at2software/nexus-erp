import { Component, inject } from '@angular/core';
import { BaseWidgetComponent } from '../base.widget.component';
import { OptionType } from '../widget-options/widget-options.component';
import { Company } from 'src/models/company/company.model';
import { WidgetsModule } from '../widgets.module';
import { ShortPipe } from 'src/pipes/short.pipe';
import { PermissionsDirective } from '@directives/permissions.directive';
import { WidgetService } from '@models/widget.service';

@Component({
    selector: 'widget-customer-support',
    templateUrl: './widget-customer-support.component.html',
    styleUrls: ['./widget-customer-support.component.scss', './../base.widget.component.scss'],
    standalone: true,
    imports: [WidgetsModule, ShortPipe, PermissionsDirective]
})
export class WidgetCustomerSupportComponent extends BaseWidgetComponent {

    data: Company[] = []
    max: number = 1
    chartData: any = undefined
    #widgetService = inject(WidgetService)

    defaultOptions = () => ({
        'max-items': { type: OptionType.Number, value: 999, i18n: $localize`:@@i18n.common.maxItems:max items` },
        'only-mine': { type: OptionType.Boolean, value: false, i18n: $localize`:@@i18n.common.onlyMine:only mine` },
        'chart-only': { type: OptionType.Boolean, value: false, i18n: $localize`:@@i18n.common.chartOnly:chart only` }
    })

    override ngOnInit() {
        super.ngOnInit()
        this.reload()
    }
    reload(): void {
        this.#widgetService.indexCashflow('CUSTOMER_SUPPORT', { ...this.getOptionsURI(), withChart: '1' }, Company).subscribe((response: any) => {
            const data = response.objects || []
            this.data = data.sort((a: any, b: any) => b.foci_unbilled_sum_duration - a.foci_unbilled_sum_duration)
            this.value = data.reduce((a: any, b: any) => a + b.foci_unbilled_sum_duration ,0)
            this.chartData = response.history
        })
    }
}
