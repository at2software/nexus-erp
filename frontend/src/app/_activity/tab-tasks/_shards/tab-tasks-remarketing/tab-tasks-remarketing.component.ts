import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { NexusModule } from '@app/nx/nexus.module';
import { Company } from '@models/company/company.model';
import { MarketingService } from '@models/marketing/marketing.service';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { TabTasksBaseComponent } from '../tab-tasks-base.component';

@Component({
    selector: 'tab-tasks-remarketing',
    templateUrl: './tab-tasks-remarketing.component.html',
    standalone: true,
    imports: [NexusModule, NgbTooltipModule, DatePipe]
})
export class TabTasksRemarketingComponent extends TabTasksBaseComponent {

    due: Company[] = []

    #marketing = inject(MarketingService)

    override reload() {
        this.#marketing.getRemarketingDue().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((response: any[]) => {
            this.due = response.map(_ => {
                const n = Company.fromJson(_)
                n.var.remarketing_due_at = _.remarketing_due_at
                return n
            })
        })
    }
}
