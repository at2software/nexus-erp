import { ActivityService } from '@activity/activity.service';
import { Component, inject, ViewChild, OnInit } from '@angular/core';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { NexusModule } from '@app/nx/nexus.module';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { ActivityTabComponent } from 'src/app/_activity/activity-tab.component';
import { NxGlobal } from 'src/app/nx/nx.global';
import { GlobalService } from 'src/models/global.service';
import { Serializable } from 'src/models/serializable';

@Component({
    selector: 'activity-tab-copypaste',
    templateUrl: './tab-copypaste.component.html',
    styleUrls: ['./tab-copypaste.component.scss'],
    standalone: true,
    imports: [ActivityTabComponent, ScrollbarComponent, NexusModule, NgbTooltipModule]
})
export class TabCopypasteComponent implements OnInit {

    global          = inject(GlobalService)
    activityService = inject(ActivityService)

    @ViewChild(ActivityTabComponent) tab:ActivityTabComponent

    ngOnInit() {
        NxGlobal.loadClipboardCookies()
        NxGlobal.onClipboardChanged.subscribe((hasClips:boolean) => {
            if (hasClips) {
                this.tab.show()
                this.tab.focus()
            } else {
                this.tab.hide()
                this.activityService.activateLatestTab()
            }
        })
        this.global.onRootObjectSelected.subscribe(NxGlobal.setCurrentRoot)
    }

    getKeys             = () => NxGlobal.getClipKeys()
    getClips            = (className:string) => NxGlobal.getClips()[className] || []
    rootAcceptsChildren = (_:string) => NxGlobal.getCurrentRoot()?.acceptsChild(NxGlobal.getClips()[_][0]) ?? false
    acceptsChild        = (_:Serializable) => NxGlobal.getCurrentRoot()?.acceptsChild(_)
    removeAll           = (className:string) => NxGlobal.unclipAll(className)

    insertAll(_:string) {
        NxGlobal.getClips()[_].forEach((x:Serializable) => x.setParent(NxGlobal.getCurrentRoot()!))
        NxGlobal.unclipAll(_)
    }

    insert(_:Serializable) {
        _.setParent(NxGlobal.getCurrentRoot()!)
        NxGlobal.unclip(_)
    }
}
