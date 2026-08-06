import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { modelListResource } from '@models/http/model-resource';
import { Nx } from '@app/nx/nx.directive';
import { NComponent } from '@shards/n/n.component';
import { AvatarComponent } from '@shards/avatar/avatar.component';
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
    #marketing = inject(MarketingService);

    #due = modelListResource(this.ready, () => this.#marketing.getRemarketingDue());
    due = this.#due.value;

    override reload() {
        this.#due.reload();
    }
}
