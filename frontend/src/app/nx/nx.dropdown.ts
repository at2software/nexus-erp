import { Component, ElementRef, inject, Input, OnChanges, OnDestroy } from "@angular/core";
import { NxAction } from "./nx.actions";
import { NxService } from "./nx.service";
import { AutopositionDirective } from "src/directives/autoposition.directive";

import { NxSubMenu } from "./ns.submenu.directive";

@Component({
    selector: 'nx-dropdown',
    templateUrl: 'nx.dropdown.html',
    host: { class: "dropdown-menu" },
    standalone: true,
    imports: [NxSubMenu, AutopositionDirective],
    styles: [`
        :host {
            width: fit-content !important;
            min-width: 200px !important;
            max-width: 400px !important;
        }
        :host ::ng-deep nx-dropdown {
            width: fit-content !important;
            min-width: 200px !important;
            max-width: 400px !important;
        }
    `]
})
export class NxDropdown implements OnChanges, OnDestroy {

    resolvedChildren?:NxAction[]

    @Input() actions: NxAction[]
    @Input() parent?:NxDropdown

    el = inject(ElementRef)
    #service = inject(NxService)

    #observer!: IntersectionObserver;

    ngOnChanges(c:any) {
        if ('actions' in c) {
            this.actions.forEach(_ => {
                if (typeof _.children === 'function') {
                    _.children = _.children()   // resolve
                }
            })
        }
    }

    children = (a: NxAction): NxAction[]|undefined => a.children as NxAction[]

    onClick = (a: NxAction) => this.#service.triggerAction(a)

    ngOnDestroy() {
        if (this.#observer) {
            this.#observer.disconnect();
        }
    }
}