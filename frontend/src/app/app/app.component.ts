import { Component, HostListener, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NxContextMenu } from '@app/nx/nx.contextmenu';
import { NgbTooltipConfig } from '@ng-bootstrap/ng-bootstrap';
import { GlobalService } from 'src/models/global.service';
import { NavigationComponent } from './navigation/navigation.component';
import { ActivityComponent } from '@activity/activity.component';
import { TabAttentionComponent } from '@activity/tab-attention/tab-attention.component';
import { TabCopypasteComponent } from '@activity/tab-copypaste/tab-copypaste.component';
import { TabTasksComponent } from '@activity/tab-tasks/tab-tasks.component';
import { TabWidgetsComponent } from '@activity/tab-widgets/tab-widgets.component';
import { TabLiveSharingComponent } from '@activity/tab-live-sharing/tab-live-sharing.component';
import { ToastsContainer } from '@shards/toast/toast.container';
import { MouseCursorOverlayComponent } from '@shards/mouse-cursor-overlay/mouse-cursor-overlay.component';
import { OnboardingWizardComponent } from '@app/_modals/onboarding-wizard/onboarding-wizard.component';
import { GuidedTourOverlayComponent } from '@shards/guided-tour/guided-tour-overlay.component';


const BREAKPOINT_ACTIVITY = 1700

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    standalone: true,
    imports: [
    NxContextMenu,
    RouterModule,
    NavigationComponent,
    ActivityComponent,
    TabAttentionComponent,
    TabCopypasteComponent,
    TabTasksComponent,
    TabWidgetsComponent,
    TabLiveSharingComponent,
    ToastsContainer,
    MouseCursorOverlayComponent,
    OnboardingWizardComponent,
    GuidedTourOverlayComponent
]
})
export class AppComponent {

    title = 'NEXUS';

    #tooltipConfig = inject(NgbTooltipConfig)
    global = inject(GlobalService)

    constructor() {
        this.#tooltipConfig.container = 'body'
        this.#tooltipConfig.animation = false
    }

    @HostListener('window:resize', ['$event']) onResize(event: any) {
        if (event.target.innerWidth < BREAKPOINT_ACTIVITY) {
            document.body.classList.add('activity-hidden', 'activity-collapsed')
        } else {
            document.body.classList.remove('activity-hidden', 'activity-collapsed')
        }
    }


}
