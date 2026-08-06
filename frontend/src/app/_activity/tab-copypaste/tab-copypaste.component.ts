import { ActivityService } from '@activity/activity.service';
import { ChangeDetectionStrategy, Component, effect, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { ActivityTabComponent } from '@activity/activity-tab.component';
import { ClipboardService } from '@app/nx/clipboard.service';
import { SelectionService } from '@app/nx/selection.service';
import { GlobalService } from '@models/global.service';
import { Serializable } from '@models/_core/serializable';
import { AvatarComponent } from '@shards/avatar/avatar.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'activity-tab-copypaste',
    templateUrl: './tab-copypaste.component.html',
    styleUrls: ['./tab-copypaste.component.scss'],
    imports: [AvatarComponent, ActivityTabComponent, ScrollbarComponent, NgbTooltipModule],
})
export class TabCopypasteComponent {
    #global = inject(GlobalService);
    #activityService = inject(ActivityService);
    #clipboard = inject(ClipboardService);
    #selection = inject(SelectionService);

    tab = viewChild.required(ActivityTabComponent);

    protected hasClips = toSignal(this.#clipboard.onChanged, { initialValue: false });
    #rootObject = toSignal(this.#global.onRootObjectSelected);

    constructor() {
        this.#global.init.subscribe(() => this.#clipboard.loadFromStorage());

        effect(() => {
            if (this.hasClips()) {
                this.tab().focus();
            } else {
                this.#activityService.activateLatestTab();
            }
        });

        effect(() => {
            const root = this.#rootObject();
            if (root instanceof Serializable) this.#selection.setRoot(root);
        });
    }

    getKeys = () => this.#clipboard.getClipKeys();
    getClips = (className: string) => this.#clipboard.getClips()[className] || [];
    rootAcceptsChildren = (_: string) => this.#selection.getRoot()?.acceptsChild(this.#clipboard.getClips()[_][0]) ?? false;
    acceptsChild = (_: Serializable) => this.#selection.getRoot()?.acceptsChild(_);
    removeAll = (className: string) => this.#clipboard.unclipAll(className);

    insertAll(_: string) {
        this.#clipboard.getClips()[_].forEach((x: Serializable) => x.setParent(this.#selection.getRoot()!));
        this.#clipboard.unclipAll(_);
    }

    insert(_: Serializable) {
        _.setParent(this.#selection.getRoot()!);
        this.#clipboard.unclip(_);
    }
}
