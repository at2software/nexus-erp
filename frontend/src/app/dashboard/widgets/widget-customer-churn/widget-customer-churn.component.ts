import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Company } from '@models/company/company.model';
import { BaseWidgetComponent, WidgetOptions } from '../base.widget.component';
import { WIDGET_SHARED } from '../widgets.shared';
import { CompanyService } from '@models/company/company.service';
import { MlReliabilityDirective } from '@directives/ml-reliability.directive';

/**
 * Model C actionable output: customers ranked by ML-predicted churn
 * probability, highest risk first. All-ML card — see frontend/CLAUDE.md's
 * ML-UI convention: the local-ai icon + reliability tooltip live once on the
 * card header instead of being repeated per row.
 */
@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'widget-customer-churn',
    templateUrl: './widget-customer-churn.component.html',
    styleUrls: ['./../base.widget.component.scss'],
    imports: [...WIDGET_SHARED, MlReliabilityDirective],
})
export class WidgetCustomerChurnComponent extends BaseWidgetComponent {
    data = signal<Company[]>([]);
    #companyService = inject(CompanyService);

    defaultOptions = () => ({
        ...WidgetOptions.maxItems,
    });

    reload(): void {
        this.#companyService.indexByChurnRisk().subscribe((data) => {
            this.data.set(data);
            this.value.set(data.filter((_) => (_.ml_churn_probability_12m ?? 0) >= 0.5).length);
        });
    }
}
