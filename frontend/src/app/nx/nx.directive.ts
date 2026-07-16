import { NxService } from './nx.service';
import { DestroyRef, Directive, ElementRef, NgZone, inject, input, output, signal } from '@angular/core';
import { NxAction } from './nx.actions';
import { INxContextMenu } from './nx.contextmenu.interface';

export interface ActionEmitterType {
    action: NxAction;
    object: Nx;
    remaining: number;
}

@Directive({
    selector: '[nx]',
    host: {
        class: 'nx',
        '[class.active]': 'selected()',
    },
})
export class Nx {
    readonly el = inject(ElementRef);
    readonly #srv = inject(NxService);

    readonly selected = signal(false);
    readonly nx = input.required<INxContextMenu>();
    readonly tables = input<INxContextMenu | INxContextMenu[]>();
    readonly context = input<string>();
    // Per-template context payload passed through to NxAction.action(); shape is consumer-defined.
    readonly nxContext = input<unknown>();
    readonly singleActionResolved = output<ActionEmitterType>();
    readonly actionsResolved = output<ActionEmitterType>();

    constructor() {
        // Expose directive instance on the DOM element for NxService.getSiblings() traversal
        this.el.nativeElement.nx = this;

        // Outside-zone listeners prevent zone.js from triggering a full CD cycle on every row interaction.
        const ngZone = inject(NgZone);
        const destroyRef = inject(DestroyRef);
        const handler = (event: MouseEvent) => this.#handleClick(event);
        const contextHandler = (event: MouseEvent) => {
            this.#srv.onRightClick(this, event);
            event.stopPropagation();
            event.preventDefault();
        };
        ngZone.runOutsideAngular(() => {
            this.el.nativeElement.addEventListener('click', handler);
            this.el.nativeElement.addEventListener('contextmenu', contextHandler);
        });
        destroyRef.onDestroy(() => {
            this.el.nativeElement.removeEventListener('click', handler);
            this.el.nativeElement.removeEventListener('contextmenu', contextHandler);
        });
    }

    #handleClick(event: MouseEvent) {
        if (document.activeElement === this.el.nativeElement) this.el.nativeElement.blur();
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

    setSelected = (_: boolean): Nx => { this.selected.set(_); return this; };
    toggleSelected = (): Nx => { this.selected.update(v => !v); return this; };
}
