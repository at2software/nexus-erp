import { Component, inject } from '@angular/core';
import { Company } from 'src/models/company/company.model';
import { WidgetService } from 'src/models/widget.service';
import { BaseWidgetComponent, WidgetOptions } from '../base.widget.component';
import { Project } from 'src/models/project/project.model';
import { REFLECTION } from 'src/constants/constants';
import { WidgetsModule } from '../widgets.module';
import { PermissionsDirective } from '@directives/permissions.directive';

@Component({
    selector: 'widget-prepared-invoices',
    templateUrl: './widget-prepared-invoices.component.html',
    styleUrls: ['./widget-prepared-invoices.component.scss', './../base.widget.component.scss'],
    standalone: true,
    imports: [WidgetsModule, PermissionsDirective]
})
export class WidgetPreparedInvoicesComponent extends BaseWidgetComponent {

    defaultOptions = () => ({ ...WidgetOptions.maxItems, ...WidgetOptions.chartOnly })

    data:(Company|Project)[] = []
    #widgetService = inject(WidgetService)
    
    reload(): void {
        if (!this.hasInvoicesExpenses) return;
        this.#widgetService.preparedInvoices(this.getOptionsURI()).subscribe((_:any) => {
            this.data = Object.values(_).map(x => {
                const c = REFLECTION(x)
                if (c instanceof Company) c.actions[0].action = () => c.navigate(`/customers/${c.id}/billing`)
                if (c instanceof Project) c.actions[0].action = () => c.navigate(`/projects/${c.id}/invoicing`)
                return c
            })
            .sort((a,b) => this.getAppliedNet(b) - this.getAppliedNet(a))
            .filter((a) => this.getAppliedNet(a) > 0)
            this.value = this.data.reduce((a,b) => a + this.getAppliedNet(b) ,0)
        })        
    }
    getAppliedNet(_:Company|Project):number {
        if (_ instanceof Company) return _.net_remaining || 0
        if (_ instanceof Project) return _.net_remaining || 0
        return 0
    }

    asProject = (_:Company|Project) => _ as Project
}
