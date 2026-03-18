import { Injectable, Type } from "@angular/core";
import { ActivityTabComponent } from "./activity-tab.component";
import { ActivityComponent } from "./activity.component";

@Injectable({ providedIn: 'root' })
export class ActivityService {

    setContainer:(value: ActivityComponent | PromiseLike<ActivityComponent>) => void
    
    tabs:ActivityTabComponent[] = []
    activeTabIndex: number = 0

    #currentUniqueId: number = 0
    #container  : ActivityComponent
    #onContainer: Promise<ActivityComponent> = new Promise<ActivityComponent>(resolve => this.setContainer = resolve)
    #timeout    : any

    getCurrentUniqueId = (): number => ++this.#currentUniqueId
    addTab (tab:ActivityTabComponent):void {
        this.#onContainer.then((container) => {
            this.#container = container
            this.#container.re.appendChild(this.#container.content.nativeElement, tab.el.nativeElement)
            this.tabs.push(tab)
            this.tabs.forEach((_, k) => _.prepare(k))

            // Show first tab if it's the only one
            if (this.tabs.length === 1) {
                this.setActiveTab(0)
            }

            this.activateLatestTab()
        })
    }
    removeTab (tab:ActivityTabComponent):void {
        this.#onContainer.then((c) => {
            this.tabs.remove(tab)
            c.re.removeChild(c.content.nativeElement, tab.el.nativeElement)
            this.activateLatestTab()
        })
    }
    activateLatestTab() { 
        if (this.#timeout) {
            clearTimeout(this.#timeout)
        }
        this.#timeout = setTimeout(() => {
            this.#timeout = undefined
            const o:any = this.#container.buttons.filter(_ => !_.nativeElement.classList.contains('d-none')).last()
            if (o) {
                o.nativeElement.click()
            }
        }, 250)
    }
    buttonFor(tab:ActivityTabComponent) {
        return this.#container.buttons.find((button:any) => button.nativeElement.dataset.bsTarget === '#' + tab.el.nativeElement.id)
    }
    focus(tab:ActivityTabComponent) {
        const index = this.tabs.indexOf(tab)
        if (index !== -1) {
            this.setActiveTab(index)
        }
    }
    
    setActiveTab(index: number) {
        this.tabs.forEach(tab => {
            tab.el.nativeElement.classList.remove('active', 'show')
        })

        if (this.tabs[index]) {
            this.tabs[this.activeTabIndex]?.onBlur()
            this.tabs[index].el.nativeElement.classList.add('active', 'show')
            this.tabs[index].onFocus()
            this.activeTabIndex = index
        }
    }

    /**
     * Switch to a specific tab by component class type
     * @param componentType The component class to search for (e.g., TabAttentionComponent)
     * @returns true if the tab was found and activated, false otherwise
     */
    switchToTabByComponent(componentType: Type<any>): boolean {
        const index = this.tabs.findIndex(tab => tab.componentType === componentType)
        if (index !== -1) {
            this.setActiveTab(index)
            return true
        }
        return false
    }

    /**
     * Switch to a specific tab by icon identifier
     * @param icon The icon name to search for (e.g., 'history', 'chat', 'task')
     * @returns true if the tab was found and activated, false otherwise
     */
    switchToTabByIcon(icon: string): boolean {
        const index = this.tabs.findIndex(tab => tab.icon === icon || tab.nicon === icon)
        if (index !== -1) {
            this.setActiveTab(index)
            return true
        }
        return false
    }

    /**
     * Switch to a specific tab by index
     * @param index The zero-based index of the tab
     */
    switchToTab(index: number): void {
        if (index >= 0 && index < this.tabs.length) {
            this.setActiveTab(index)
        }
    }

}