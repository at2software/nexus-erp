import { ActivityTabComponent } from '@activity/activity-tab.component';
import { Component, inject, ViewChild } from '@angular/core';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { TabTasksHrComponent } from './_shards/tab-tasks-hr/tab-tasks-hr.component';
import { TabTasksSentinelsComponent } from './_shards/tab-tasks-sentinels/tab-tasks-sentinels.component';
import { TabTasksRemarketingComponent } from './_shards/tab-tasks-remarketing/tab-tasks-remarketing.component';
import { TabTasksMilestonesComponent } from './_shards/tab-tasks-milestones/tab-tasks-milestones.component';
import { TabTasksPluginTasksComponent } from './_shards/tab-tasks-plugin-tasks/tab-tasks-plugin-tasks.component';
import { TabTasksInvoiceableComponent } from './_shards/tab-tasks-invoiceable/tab-tasks-invoiceable.component';
import { User } from '@models/user/user.model';
import { GlobalService } from '@models/global.service';

@Component({
    selector: 'activity-tab-tasks',
    templateUrl: './tab-tasks.component.html',
    styleUrls: ['./tab-tasks.component.scss'],
    standalone: true,
    imports: [
        ActivityTabComponent,
        ScrollbarComponent,
        TabTasksHrComponent,
        TabTasksSentinelsComponent,
        TabTasksRemarketingComponent,
        TabTasksMilestonesComponent,
        TabTasksPluginTasksComponent,
        TabTasksInvoiceableComponent
    ]
})
export class TabTasksComponent {

    @ViewChild(ActivityTabComponent) tabComponent: ActivityTabComponent

    #counts = new Map<string, number>()
    #global = inject(GlobalService)
    user?:User

    ngOnInit() {
        this.#global.init.subscribe(() => this.user = this.#global.user)
    }

    onCount(key: string, n: number) {
        this.#counts.set(key, n)
        const total = Array.from(this.#counts.values()).reduce((a, b) => a + b, 0)
        this.tabComponent.badge = total > 0 ? '!' : undefined
    }
}
