import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Company } from '@models/company/company.model';
import { WidgetService } from '@models/widget.service';
import { BaseWidgetComponent, WidgetOptions } from '../base.widget.component';
import { Project } from '@models/project/project.model';
import { REFLECTION } from '@constants/constants';
import { WidgetsModule } from '../widgets.module';
import { PermissionsDirective } from '@directives/permissions.directive';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'widget-prepared-invoices',
    templateUrl: './widget-prepared-invoices.component.html',
    styleUrls: ['./widget-prepared-invoices.component.scss', './../base.widget.component.scss'],
    standalone: true,
    imports: [WidgetsModule, PermissionsDirective],
})
export class WidgetPreparedInvoicesComponent extends BaseWidgetComponent {
    data = signal<(Company | Project)[]>([]);
    #widgetService = inject(WidgetService);

    defaultOptions = () => ({ ...WidgetOptions.maxItems, ...WidgetOptions.chartOnly });

    reload(): void {
        if (!this.hasInvoicesExpenses) return;
        this.#widgetService.preparedInvoices(this.getOptionsURI()).subscribe((_: any) => {
            const data = Object.values(_)
                .map((x) => {
                    const c = REFLECTION(x);
                    if (c instanceof Company) c.actions[0].action = () => c.navigateTo(`/customers/${c.id}/billing`);
                    if (c instanceof Project) c.actions[0].action = () => c.navigateTo(`/projects/${c.id}/invoicing`);
                    return c;
                })
                .sort((a, b) => this.#getAppliedNet(b) - this.#getAppliedNet(a))
                .filter((a) => this.#getAppliedNet(a) > 0);
            this.data.set(data);
            this.value.set(data.reduce((a, b) => a + this.#getAppliedNet(b), 0));
        });
    }

    #getAppliedNet(_: Company | Project): number {
        return _.net_remaining || 0;
    }

    getAppliedNet = (_: Company | Project) => this.#getAppliedNet(_);
    asProject = (_: Company | Project) => _ as Project;
}
