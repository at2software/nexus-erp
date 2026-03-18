import { Directive, ElementRef, HostListener, Input, Renderer2, OnInit, inject } from "@angular/core";

@Directive({
    selector: '[collapsible]',
    standalone: true
})
export class CollapsibleDirective implements OnInit {
    
    @Input('collapsible') container:HTMLElement
    
    #button:any
    #el: ElementRef = inject(ElementRef)
    #re: Renderer2 = inject(Renderer2)

    ngOnInit() {
        this.#button = this.#re.createElement('i')
        this.#re.addClass(this.#button, 'm-1')
        this.#re.addClass(this.#button, 'ms-0')
        this.#re.addClass(this.#button, 'me-2')
        this.#re.insertBefore(this.#el.nativeElement, this.#button, this.#el.nativeElement.firstChild)
        this.#el.nativeElement.style.cursor = 'pointer'
        this.#el.nativeElement.style.userSelect = 'none'
        this.updateCollapsedVisualisation()
    }

    @HostListener('click') onClick() {
        if (this.isCollapsed()) this.#re.removeClass(this.#el.nativeElement, 'collapsed')
        else this.#re.addClass(this.#el.nativeElement, 'collapsed')
        this.updateCollapsedVisualisation()
    }
    
    isCollapsed = ():boolean => this.#el.nativeElement.classList.contains('collapsed')

    updateCollapsedVisualisation() {
        this.container.style.overflow = this.isCollapsed() ? "hidden" : 'visible'
        this.container.style.height = this.isCollapsed() ? "0" : 'auto'
        this.#button.innerHTML = this.isCollapsed() ? 'expand_more' : 'expand_less'
    }
}