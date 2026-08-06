import { DestroyRef, Directive, effect, ElementRef, inject, input, Renderer2 } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';

@Directive({
    selector: '[collapsible]',
})
export class CollapsibleDirective {
    readonly container = input.required<HTMLElement>({ alias: 'collapsible' });

    readonly #el = inject(ElementRef);
    readonly #re = inject(Renderer2);
    #button: HTMLElement;

    constructor() {
        const el: HTMLElement = this.#el.nativeElement;
        this.#button = this.#re.createElement('i');
        this.#re.addClass(this.#button, 'm-1');
        this.#re.addClass(this.#button, 'ms-0');
        this.#re.addClass(this.#button, 'me-2');
        this.#re.insertBefore(el, this.#button, el.firstChild);
        el.style.cursor = 'pointer';
        el.style.userSelect = 'none';

        fromEvent(el, 'click')
            .pipe(takeUntilDestroyed(inject(DestroyRef)))
            .subscribe(() => {
                if (this.#isCollapsed()) this.#re.removeClass(el, 'collapsed');
                else this.#re.addClass(el, 'collapsed');
                this.#updateVisuals();
            });

        effect(() => this.#updateVisuals());
    }

    #isCollapsed = (): boolean => this.#el.nativeElement.classList.contains('collapsed');

    #updateVisuals() {
        const collapsed = this.#isCollapsed();
        const container = this.container();
        container.style.overflow = collapsed ? 'hidden' : 'visible';
        container.style.height = collapsed ? '0' : 'auto';
        this.#button.innerHTML = collapsed ? 'expand_more' : 'expand_less';
    }
}
