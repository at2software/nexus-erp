import { Component, ElementRef, inject, Input, OnInit } from '@angular/core';
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
    selector: 'guided-tour',
    template: '',
    standalone: true
})
export class GuidedTourComponent implements OnInit {

    @Input({ required: true }) id!: string;
    @Input() title?: string;
    @Input({ required: true }) content!: string;
    @Input() focusSelector?: string;
    /** Native HTMLElement from a template ref (#myEl) or Angular ElementRef */
    @Input() focusElement?: HTMLElement | ElementRef;

    #service = inject(GuidedTourService);
    #el = inject(ElementRef);

    ngOnInit(): void {
        setTimeout(() => {
            if (this.#service.isDisabled) return;
            this.#service.register([{
                id: this.id,
                title: this.title,
                content: this.content,
                focusSelector: this.focusSelector,
                focusElement: this.focusElement
            }], this.#getDomDepth());
        });
    }

    #getDomDepth(): number {
        let depth = 0;
        let el: HTMLElement | null = this.#el.nativeElement.parentElement;
        while (el && el !== document.body) { depth++; el = el.parentElement; }
        return depth;
    }
}
