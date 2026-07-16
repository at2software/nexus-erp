import { ChangeDetectionStrategy, Component, ElementRef, Renderer2, viewChild, viewChildren, inject } from '@angular/core';
import { ActivityService } from './activity.service';
import { ActivitySidebarStateService } from './activity-sidebar-state.service';
import { NComponent } from '@shards/n/n.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-activity',
    templateUrl: './activity.component.html',
    styleUrls: ['./activity.component.scss'],
    imports: [NComponent],
})
export class ActivityComponent {
    readonly content = viewChild.required<ElementRef>('content');
    readonly buttons = viewChildren<ElementRef>('buttonRef');
    readonly srv = inject(ActivityService);
    readonly re = inject(Renderer2);
    readonly #sidebarStateService = inject(ActivitySidebarStateService);

    constructor() {
        this.srv.setContainer(this);
    }

    onActivityTabClicked() {
        this.#sidebarStateService.toggleSidebar();
    }
}
