import { Component, ElementRef, inject, input, effect } from "@angular/core";
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
export class NxDropdown {

    actions = input.required<NxAction[]>();
    parent  = input<NxDropdown | undefined>(undefined);

    el       = inject(ElementRef);
    #service = inject(NxService);

    constructor() {
        effect(() => {
            this.actions().forEach(a => {
                if (typeof a.children === 'function') {
                    a.children = a.children();
                }
            });
        });
    }

    children = (a: NxAction): NxAction[] | undefined => a.children as NxAction[];
    onClick  = (a: NxAction) => this.#service.triggerAction(a);
}
