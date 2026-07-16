import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { Nx } from '@app/nx/nx.directive';
import { NComponent } from '@shards/n/n.component';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { Company } from '@models/company/company.model';
import { MarketingService } from '@models/marketing/marketing.service';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { TabTasksBaseComponent } from '../tab-tasks-base.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'tab-tasks-remarketing',
    templateUrl: './tab-tasks-remarketing.component.html',
    imports: [Nx, NComponent, AvatarComponent, NgbTooltipModule, DatePipe],
})
export class TabTasksRemarketingComponent extends TabTasksBaseComponent {
    due = signal<Company[]>([]);

    #marketing = inject(MarketingService);

    override reload() {
        this.#marketing
            .getRemarketingDue()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((response) => this.due.set(response));
    }
}
