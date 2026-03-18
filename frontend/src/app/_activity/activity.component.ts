import { Component, ElementRef, QueryList, Renderer2, ViewChild, ViewChildren, inject, OnInit } from '@angular/core';
import { ActivityTabComponent } from './activity-tab.component';
import { ActivityService } from './activity.service';
import { ActivitySidebarStateService } from './activity-sidebar-state.service';
import { NexusModule } from '@app/nx/nexus.module';


@Component({
    selector: 'app-activity',
    templateUrl: './activity.component.html',
    styleUrls: ['./activity.component.scss'],
    standalone: true,
    imports: [NexusModule]
})
export class ActivityComponent implements OnInit {

    @ViewChild('content') content: ElementRef
    @ViewChildren('buttonRef') buttons:QueryList<any>

    srv = inject(ActivityService)
    re  = inject(Renderer2)
    el  = inject(ElementRef)
    sidebarStateService = inject(ActivitySidebarStateService)

    ngOnInit() {
        this.srv.setContainer(this)
    }

    isHidden = (_:ActivityTabComponent) => _.hidden()

    onActivityTabClicked = () => {
        this.sidebarStateService.toggleSidebar();
    }
}
