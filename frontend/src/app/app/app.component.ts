import { ChangeDetectionStrategy, Component, effect, inject, NgZone } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { NxContextMenu } from '@app/nx/nx.contextmenu';
import { NgbTooltipConfig } from '@ng-bootstrap/ng-bootstrap';
import { fromEvent, map } from 'rxjs';
import { GlobalService } from '@models/global.service';
import { LiveSyncService } from '@models/live-sync.service';
import { NavigationComponent } from './navigation/navigation.component';
import { ActivityComponent } from '@activity/activity.component';
import { TabAttentionComponent } from '@activity/tab-attention/tab-attention.component';
import { TabCopypasteComponent } from '@activity/tab-copypaste/tab-copypaste.component';
import { TabTasksComponent } from '@activity/tab-tasks/tab-tasks.component';
import { TabInvoicingComponent } from '@activity/tab-invoicing/tab-invoicing.component';
import { TabWidgetsComponent } from '@activity/tab-widgets/tab-widgets.component';
import { ToastsContainer } from '@shards/toast/toast.container';

const BREAKPOINT_ACTIVITY = 1700;

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    imports: [NxContextMenu, RouterModule, NavigationComponent, ActivityComponent, TabAttentionComponent, TabCopypasteComponent, TabTasksComponent, TabInvoicingComponent, TabWidgetsComponent, ToastsContainer],
})
export class AppComponent {
    #tooltipConfig = inject(NgbTooltipConfig);
    #global = inject(GlobalService);

    init = toSignal(this.#global.init.pipe(map(() => true)), { initialValue: false });

    #narrow = toSignal(
        fromEvent<UIEvent>(window, 'resize').pipe(map(e => (e.target as Window).innerWidth < BREAKPOINT_ACTIVITY)),
        { initialValue: window.innerWidth < BREAKPOINT_ACTIVITY }
    );

    constructor() {
        // root services are lazy - construct LiveSyncService at startup so it listens from the first event
        inject(LiveSyncService);

        this.#tooltipConfig.container = 'body';
        this.#tooltipConfig.animation = false;

        effect(() => {
            document.body.classList.toggle('activity-hidden', this.#narrow());
            document.body.classList.toggle('activity-collapsed', this.#narrow());
        });

        // Prevent Firefox from navigating to dropped files.
        // Capture phase fires before element handlers and before Firefox's navigation decision.
        inject(NgZone).runOutsideAngular(() => {
            // Capture phase: lets dragover reach every element so the copy cursor shows everywhere.
            window.addEventListener('dragover', (e) => e.preventDefault(), true);
            // Bubble phase: fallback for drops that land outside a [dnd] zone.
            // Drops inside a [dnd] zone are stopped by stopPropagation() in onDrop and never reach here.
            window.addEventListener('drop', (e) => e.preventDefault(), false);
        });
    }
}
