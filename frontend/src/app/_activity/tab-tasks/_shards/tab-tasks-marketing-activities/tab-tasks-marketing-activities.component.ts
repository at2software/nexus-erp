import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { modelListResource, modelResource } from '@models/http/model-resource';
import { RouterModule } from '@angular/router';
import { Nx } from '@app/nx/nx.directive';
import { NComponent } from '@shards/n/n.component';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { MarketingService } from '@models/marketing/marketing.service';
import { ActivityService } from '@activity/activity.service';
import { ActivityTabComponent } from '@activity/activity-tab.component';
import { ActivitySidebarStateService } from '@activity/activity-sidebar-state.service';
import { TabTasksBaseComponent } from '../tab-tasks-base.component';
import { AvatarComponent } from '@shards/avatar/avatar.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'tab-tasks-marketing-activities',
    templateUrl: './tab-tasks-marketing-activities.component.html',
    imports: [AvatarComponent, Nx, NComponent, NgbTooltipModule, RouterModule, DatePipe],
})
export class TabTasksMarketingActivitiesComponent extends TabTasksBaseComponent {
    #service = inject(MarketingService);
    #activity = inject(ActivityService);
    #sidebar = inject(ActivitySidebarStateService);
    #tab = inject(ActivityTabComponent, { optional: true });

    #count = modelResource(this.ready, () => this.#service.countProspectActivitiesForAddon());
    #opened = signal(!this.#tab);
    #rowsWanted = computed(() => (this.ready() && this.#opened()) || undefined);
    #activities = modelListResource(this.#rowsWanted, () => this.#service.indexProspectActivitiesForAddon({}));

    activities = this.#activities.value;
    count = computed(() => this.#count.value()?.count ?? 0);

    constructor() {
        super();
        effect(() => {
            const onScreen = !this.#sidebar.collapsed() && this.#activity.tabs()[this.#activity.activeTabIndex()] === this.#tab;
            if (this.#tab && onScreen) this.#opened.set(true);
        });
    }

    override reload() {
        this.#count.reload();
        if (this.#opened()) this.#activities.reload();
    }
}
