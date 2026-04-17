import { NxService } from './nx.service';
import { Directive, Input, HostListener, ElementRef, Renderer2, AfterViewInit, inject, HostBinding, output } from '@angular/core';
import { NxAction } from './nx.actions';
import { INxContextMenu } from './nx.contextmenu.interface';

export interface ActionEmitterType {
    action: NxAction,
    object: Nx,
    remaining: number
}

@Directive({
    selector: '[nx]',
    standalone: true
})
export class Nx implements AfterViewInit {

    selected = false;

    @Input({ required: true }) nx!: INxContextMenu;
    @Input() tables?: INxContextMenu | INxContextMenu[];
    @Input() context?: string;
    @Input() nxContext?: any;

    singleActionResolved = output<ActionEmitterType>();
    actionsResolved      = output<ActionEmitterType>();

    @HostBinding('nx') get nxAttribute(): Nx { return this; }
    @HostBinding('class.active') get classActive(): boolean { return this.selected; }

    @HostListener('click', ['$event']) onClick = (event: MouseEvent) => {
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

    @HostListener('contextmenu', ['$event']) onContext = (event: MouseEvent) => {
        this.#srv.onRightClick(this, event);
        event.stopPropagation();
        event.preventDefault();
    }

    el   = inject(ElementRef);
    #re  = inject(Renderer2);
    #srv = inject(NxService);

    ngAfterViewInit() {
        this.#re.addClass(this.el.nativeElement, 'nx');
    }

    setSelected    = (_: boolean): Nx => { this.selected = _; return this; }
    toggleSelected = (): Nx => { this.selected = !this.selected; return this; }
}
