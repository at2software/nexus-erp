import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, input } from '@angular/core';
import { GuidedTourService } from './guided-tour.service';

/**
 * Single-slide guided tour registrar. Place at the bottom of any template.
 * Use @if for conditional slides (e.g. permission checks).
 * Use i18n-title / i18n-content attributes for localization.
 *
 * Example — CSS selector focus:
 *   <guided-tour
 *     id="my-feature"
 *     i18n-title="@@i18n.guide.title" title="My Feature"
 *     i18n-content="@@i18n.guide.content" content="Click this to do X."
 *     focusSelector="[data-my-element]">
 *   </guided-tour>
 *
 * Example — template ref focus (TypeScript catches stale refs when #ref is removed):
 *   <li #dashboardNav>...</li>
 *   <guided-tour id="nav-dashboard" content="..." [focusElement]="dashboardNav">
 *   </guided-tour>
 *
 * Multiple <guided-tour> elements in the same template are shown in template order
 * (siblings share the same DOM depth so stable sort preserves their sequence).
 */
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
