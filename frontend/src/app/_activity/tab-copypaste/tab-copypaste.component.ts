import { ActivityService } from '@activity/activity.service';
import { ChangeDetectionStrategy, Component, effect, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { ActivityTabComponent } from '@activity/activity-tab.component';
import { NxGlobal } from '@app/nx/nx.global';
import { GlobalService } from '@models/global.service';
import { Serializable } from '@models/serializable';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'activity-tab-copypaste',
    templateUrl: './tab-copypaste.component.html',
    styleUrls: ['./tab-copypaste.component.scss'],
    standalone: true,
    imports: [ActivityTabComponent, ScrollbarComponent, NgbTooltipModule],
})
export class TabCopypasteComponent {
    #global = inject(GlobalService);
    #activityService = inject(ActivityService);

    tab = viewChild.required(ActivityTabComponent);

    #hasClips = toSignal(NxGlobal.onClipboardChanged, { initialValue: false });
    #rootObject = toSignal(this.#global.onRootObjectSelected);

    constructor() {
        this.#global.init.subscribe(() => NxGlobal.loadClipboardCookies());

        effect(() => {
            if (this.#hasClips()) {
                this.tab().show();
                this.tab().focus();
            } else {
                this.tab().hide();
                this.#activityService.activateLatestTab();
            }
        });

        effect(() => {
            const root = this.#rootObject();
            if (root != null) NxGlobal.setCurrentRoot(root);
        });
    }

    getKeys = () => NxGlobal.getClipKeys();
    getClips = (className: string) => NxGlobal.getClips()[className] || [];
    rootAcceptsChildren = (_: string) => NxGlobal.getCurrentRoot()?.acceptsChild(NxGlobal.getClips()[_][0]) ?? false;
    acceptsChild = (_: Serializable) => NxGlobal.getCurrentRoot()?.acceptsChild(_);
    removeAll = (className: string) => NxGlobal.unclipAll(className);

    insertAll(_: string) {
        NxGlobal.getClips()[_].forEach((x: Serializable) => x.setParent(NxGlobal.getCurrentRoot()!));
        NxGlobal.unclipAll(_);
    }

    insert(_: Serializable) {
        _.setParent(NxGlobal.getCurrentRoot()!);
        NxGlobal.unclip(_);
    }
}
