import { Directive, ElementRef, Input, Renderer2, AfterViewInit } from "@angular/core";
@Directive({
    selector: 'input.[suffix],input.[prefix]',
    standalone: true
})
export class AffixInputDirective implements AfterViewInit {
    @Input() prefix:string;
    @Input() suffix:string;
    constructor(private el: ElementRef, private re:Renderer2) {}

    ngAfterViewInit():void {
        const el = this.el.nativeElement
        const parent = el.parentNode
        const wrapper = this.re.createElement('div')

        this.re.removeChild(parent, el)
        this.re.appendChild(wrapper, el)
        this.re.appendChild(parent, wrapper)

        this.re.addClass(wrapper, 'input-affix-wrapper')
        this.re.addClass(wrapper, 'form-control')
        if (this.prefix) {
            this.re.setAttribute(wrapper, 'data-prefix', this.prefix)
            this.re.addClass(wrapper, 'has-prefix')
        }
        if (this.suffix) {
            this.re.setAttribute(wrapper, 'data-suffix', this.suffix)
            this.re.addClass(wrapper, 'has-suffix')
        }

        this.re.listen(wrapper, 'click', (e) => {
            if (e.target !== el) el.focus()
        })
    }
}
