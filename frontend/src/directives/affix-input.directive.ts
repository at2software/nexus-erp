import { afterNextRender, Directive, ElementRef, inject, input, Renderer2 } from "@angular/core";

@Directive({
    selector: 'input[suffix],input[prefix]',
    standalone: true
})
export class AffixInputDirective {
    readonly prefix = input<string>()
    readonly suffix = input<string>()

    readonly #el = inject(ElementRef)
    readonly #re = inject(Renderer2)

    constructor() {
        afterNextRender(() => {
            const el = this.#el.nativeElement
            this.#re.addClass(el, 'form-control')
            const parent = el.parentNode
            const wrapper = this.#re.createElement('div')
            this.#re.addClass(wrapper, 'input-group')

            this.#re.removeChild(parent, el)

            if (this.prefix()) {
                const span = this.#re.createElement('span')
                this.#re.addClass(span, 'input-group-text')
                this.#re.appendChild(span, this.#re.createText(this.prefix()!))
                this.#re.appendChild(wrapper, span)
            }

            this.#re.appendChild(wrapper, el)

            if (this.suffix()) {
                const span = this.#re.createElement('span')
                this.#re.addClass(span, 'input-group-text')
                this.#re.appendChild(span, this.#re.createText(this.suffix()!))
                this.#re.appendChild(wrapper, span)
            }

            this.#re.appendChild(parent, wrapper)
        })
    }
}
