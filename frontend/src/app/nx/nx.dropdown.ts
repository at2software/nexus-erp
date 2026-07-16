import { ChangeDetectionStrategy, Component, ElementRef, inject, input } from '@angular/core';
import { NxAction } from './nx.actions';
import { NxService, resolved } from './nx.service';
import { AutopositionDirective } from '@directives/autoposition.directive';
import { NxSubMenu } from './ns.submenu.directive';

@Component({
    selector: 'nx-dropdown',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: 'nx.dropdown.html',
    host: { class: 'dropdown-menu' },
    imports: [NxSubMenu, AutopositionDirective],
    styles: [
        `
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
        `,
    ],
})
export class NxDropdown {
    actions = input.required<NxAction[]>();
    parent = input<NxDropdown | undefined>(undefined);

    el = inject(ElementRef);
    #service = inject(NxService);

    children = (a: NxAction): NxAction[] | undefined => resolved<NxAction[] | undefined>(a.children);
    onClick = (a: NxAction) => this.#service.triggerAction(a);
}
