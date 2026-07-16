import { ActivityTabComponent } from '@activity/activity-tab.component';
import { ChangeDetectionStrategy, Component, effect, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { TabTasksInvoiceableComponent } from '../tab-tasks/_shards/tab-tasks-invoiceable/tab-tasks-invoiceable.component';
import { GlobalService } from '@models/global.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'activity-tab-invoicing',
    templateUrl: './tab-invoicing.component.html',
    imports: [ActivityTabComponent, ScrollbarComponent, TabTasksInvoiceableComponent],
})
export class TabInvoicingComponent {
    readonly tabComponent = viewChild.required(ActivityTabComponent);
    readonly #global = inject(GlobalService);
    readonly user = toSignal(this.#global.init.pipe(map(() => this.#global.user)));

    constructor() {
        effect(() => {
            const user = this.user();
            this.tabComponent().hidden.set(!user?.hasRole('invoicing'));
        });
    }
}
