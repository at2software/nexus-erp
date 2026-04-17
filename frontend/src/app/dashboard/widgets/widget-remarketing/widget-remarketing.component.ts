import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Company } from '@models/company/company.model';
import { MarketingService } from '@models/marketing/marketing.service';
import { BaseWidgetComponent } from '../base.widget.component';
import { WidgetsModule } from '../widgets.module';
import { NexusModule } from '@app/nx/nexus.module';


@Component({
    selector: 'widget-remarketing',
    standalone: true,
    templateUrl: './widget-remarketing.component.html',
    styleUrl: './widget-remarketing.component.scss',
    imports: [WidgetsModule, NexusModule]
})
export class WidgetRemarketingComponent extends BaseWidgetComponent {

    #destroyRef = inject(DestroyRef)

    service = inject(MarketingService)

    due: Company[]
    observed: Company[]

    defaultOptions = () => ({})

    reload() {
        this.service.getRemarketing().pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((result:any) => {
            this.observed = result.observed.map(this.#toCompany).sort((a: Company, b: Company) => b.remarketingProgress - a.remarketingProgress)
        })
    }
    #toCompany = (_: any): Company => {
        const m = Company.fromJson(_)
        m.var.revenue_12 = _.revenue_12
        m.var.remarketing_due_at = _.remarketing_due_at
        return m
    }
}
