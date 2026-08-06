import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Company } from '@models/company/company.model';
import { BaseWidgetComponent, WidgetOptions } from '../base.widget.component';
import { WIDGET_SHARED } from '../widgets.shared';
import { CompanyService } from '@models/company/company.service';
import { MlReliabilityDirective } from '@directives/ml-reliability.directive';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'widget-customer-churn',
    templateUrl: './widget-customer-churn.component.html',
    styleUrls: ['./../base.widget.component.scss'],
    imports: [...WIDGET_SHARED, MlReliabilityDirective],
})
export class WidgetCustomerChurnComponent extends BaseWidgetComponent {
    #companyService = inject(CompanyService);

    defaultOptions = () => ({
        ...WidgetOptions.maxItems,
    });

    readonly #churnRisk = this.optionsResource(() => this.#companyService.indexByChurnRisk());
    readonly data = computed<Company[]>(() => this.#churnRisk.value() ?? []);
    override value = this.headline(this.#churnRisk, () => this.data().filter((_) => _.mlChurnHigh()).length);
}
