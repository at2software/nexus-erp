import { NxService } from './nx.service';
import { Directive, ElementRef, inject, input, output, signal } from '@angular/core';
import { NxAction } from './nx.actions';
import { INxContextMenu } from './nx.contextmenu.interface';

export interface ActionEmitterType {
    action: NxAction;
    object: Nx;
    remaining: number;
}

@Directive({
    selector: '[nx]',
    standalone: true,
    host: {
        class: 'nx',
        '[class.active]': 'selected()',
        '(click)': 'onClick($event)',
        '(contextmenu)': 'onContext($event)',
    },
})
export class Nx {
    readonly el = inject(ElementRef);
    readonly #srv = inject(NxService);

    readonly selected = signal(false);
    readonly nx = input.required<INxContextMenu>();
    readonly tables = input<INxContextMenu | INxContextMenu[]>();
    readonly context = input<string>();
    readonly nxContext = input<any>();
    readonly singleActionResolved = output<ActionEmitterType>();
    readonly actionsResolved = output<ActionEmitterType>();

    constructor() {
        // Expose directive instance on the DOM element for NxService.getSiblings() traversal
        this.el.nativeElement.nx = this;
    }

    onClick(event: MouseEvent) {
        this.el.nativeElement.blur();
        if (event.ctrlKey && event.shiftKey) {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.#srv.onCtrlShiftClick(this, event);
        } else if (event.shiftKey) {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.#srv.onRange(this);
        } else if (event.ctrlKey) {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.#srv.toggle(this);
        } else {
            this.#srv.onClick(this);
        }
    }

    onContext(event: MouseEvent) {
        this.#srv.onRightClick(this, event);
        event.stopPropagation();
        event.preventDefault();
    }

    setSelected = (_: boolean): Nx => { this.selected.set(_); return this; };
    toggleSelected = (): Nx => { this.selected.update(v => !v); return this; };
}
