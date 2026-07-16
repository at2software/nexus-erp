import { Injectable } from '@angular/core';
import { storageGet, storageSet } from '@constants/storage';

@Injectable({ providedIn: 'root' })
export class ActivitySidebarStateService {
    readonly #STORAGE_KEY = 'activity-sidebar-collapsed';

    constructor() {
        this.#restoreSidebarState();
    }

    toggleSidebar(): void {
        const isCollapsed = document.body.classList.contains('activity-collapsed');

        if (isCollapsed) {
            document.body.classList.remove('activity-collapsed');
            this.#saveSidebarState(false);
        } else {
            document.body.classList.add('activity-collapsed');
            this.#saveSidebarState(true);
        }
    }

    #saveSidebarState(isCollapsed: boolean): void {
        storageSet(this.#STORAGE_KEY, isCollapsed);
    }

    #restoreSidebarState(): void {
        const savedState = storageGet<boolean | null>(this.#STORAGE_KEY, null);
        if (savedState === true) {
            document.body.classList.add('activity-collapsed');
        } else if (savedState === false) {
            document.body.classList.remove('activity-collapsed');
        }
    }

    isCollapsed(): boolean {
        return document.body.classList.contains('activity-collapsed');
    }
}
