import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Nx } from '@app/nx/nx.directive';
import { NComponent } from '@shards/n/n.component';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { MarketingProspectActivity } from '@models/marketing/marketing-prospect-activity.model';
import { MarketingService } from '@models/marketing/marketing.service';
import { TabTasksBaseComponent } from '../tab-tasks-base.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'tab-tasks-marketing-activities',
    templateUrl: './tab-tasks-marketing-activities.component.html',
    standalone: true,
    imports: [Nx, NComponent, NgbTooltipModule, RouterModule, DatePipe],
})
export class TabTasksMarketingActivitiesComponent extends TabTasksBaseComponent {
    activities = signal<MarketingProspectActivity[]>([]);

    readonly #collapsed = signal<Set<string>>(new Set());
    toggle = (key: string) => this.#collapsed.update(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });
    isCollapsed = (key: string) => this.#collapsed().has(key);

    #service = inject(MarketingService);

    override reload() {
        this.#service.indexProspectActivitiesForAddon({}).subscribe((data) => this.activities.set(data));
    }
}
