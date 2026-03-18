import { NxService } from './nx.service';
import { Directive, Input, HostListener, ElementRef, Renderer2, AfterViewInit, Output, EventEmitter, inject, HostBinding } from '@angular/core';
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

    selected:boolean = false

    @Input() nx: INxContextMenu
    @Input() tables?:INxContextMenu|INxContextMenu[]
    @Input() context?:string
    @Input() nxContext?: any  // Additional context data for context menu actions
    @Output() singleActionResolved: EventEmitter<ActionEmitterType> = new EventEmitter<ActionEmitterType>()
    @Output() actionsResolved: EventEmitter<ActionEmitterType> = new EventEmitter<ActionEmitterType>()
    
    @HostBinding('nx') get nxAttribute ():Nx { return this }
    @HostBinding('class.active') get classActive ():boolean { return this.selected }

    @HostListener('click', ['$event']) onClick = (event: MouseEvent) => {
        this.el.nativeElement.blur()
        if (event.ctrlKey && event.shiftKey) {
            // CTRL+SHIFT+Click: Open primary action in new tab
            this.#srv.onCtrlShiftClick(this, event)
        }
        else if (event.shiftKey) {
            this.#srv.onRange(this)
        }
        else if (event.ctrlKey) {
            this.#srv.toggle(this)
        }
        else {
            this.#srv.onClick(this)
        }
    }
    @HostListener('contextmenu', ['$event']) onContext = (event: MouseEvent) => {
        this.#srv.onRightClick(this, event);
        event.stopPropagation();
        event.preventDefault();
    }

    el: ElementRef = inject(ElementRef)
    #re: Renderer2 = inject(Renderer2)
    #srv: NxService = inject(NxService)

    ngAfterViewInit() {
        this.#re.addClass(this.el.nativeElement, 'nx')
    }

    setSelected = (_:boolean):Nx => { this.selected = _; return this; }
    toggleSelected = ():Nx => { this.selected = !this.selected; return this; }

}
