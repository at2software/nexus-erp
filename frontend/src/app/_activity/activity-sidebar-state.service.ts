import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ActivitySidebarStateService {
    readonly #STORAGE_KEY = 'activity-sidebar-collapsed';

    constructor() {
        // Restore sidebar state on service initialization
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
        localStorage.setItem(this.#STORAGE_KEY, isCollapsed.toString());
    }

    #restoreSidebarState(): void {
        const savedState = localStorage.getItem(this.#STORAGE_KEY);
        
        if (savedState === 'true') {
            document.body.classList.add('activity-collapsed');
        } else if (savedState === 'false') {
            document.body.classList.remove('activity-collapsed');
        }
        // If no saved state exists, keep default state
    }

    isCollapsed(): boolean {
        return document.body.classList.contains('activity-collapsed');
    }
}