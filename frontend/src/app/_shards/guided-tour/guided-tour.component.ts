import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, input } from '@angular/core';
import { GuidedTourService } from './guided-tour.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'guided-tour',
    template: '',
})
export class GuidedTourComponent {
    id = input.required<string>();
    content = input.required<string>();
    title = input<string | undefined>();
    focusSelector = input<string | undefined>();
    focusElement = input<HTMLElement | ElementRef | undefined>();

    #service = inject(GuidedTourService);
    #el = inject(ElementRef);
    #registered = false;

    constructor() {
        effect(() => {
            const id = this.id();
            const content = this.content();
            const title = this.title();
            const focusSelector = this.focusSelector();
            const focusElement = this.focusElement();
            if (this.#registered) return;

            setTimeout(() => {
                if (this.#service.isDisabled) return;
                this.#service.register(
                    [
                        {
                            id,
                            title,
                            content,
                            focusSelector,
                            focusElement,
                        },
                    ],
                    this.#getDomDepth(),
                );
                this.#registered = true;
            });
        });
    }

    #getDomDepth(): number {
        let depth = 0;
        let el: HTMLElement | null = this.#el.nativeElement.parentElement;
        while (el && el !== document.body) {
            depth++;
            el = el.parentElement;
        }
        return depth;
    }
}
