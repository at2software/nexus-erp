import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, ElementRef, NgZone, computed, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { GuidedSlide, GuidedTourService } from './guided-tour.service';
import { fromEvent } from 'rxjs';
import { Dictionary } from '@constants/constants';

interface OverlayPanels {
    top: Dictionary<string>;
    bottom: Dictionary<string>;
    left: Dictionary<string>;
    right: Dictionary<string>;
    ring: Dictionary<string>;
    card: Dictionary<string>;
    /** True when the focused element is too wide/tall for side placement — card is centered instead */
    cardCentered: boolean;
}

const PAD = 10;
const CARD_WIDTH = 380;
const CARD_MARGIN = 32;
const CARD_HEIGHT_EST = 220;
/** Elements wider than this fraction of the viewport trigger centered card placement */
const WIDE_THRESHOLD = 0.5;

@Component({
    selector: 'guided-tour-overlay',
    templateUrl: './guided-tour-overlay.component.html',
    styleUrls: ['./guided-tour-overlay.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuidedTourOverlayComponent {
    #service = inject(GuidedTourService);
    #cdr = inject(ChangeDetectorRef);
    #destroyRef = inject(DestroyRef);
    #ngZone = inject(NgZone);

    currentSlide: GuidedSlide | null = null;
    panels: OverlayPanels | null = null;
    disableChecked = false;

    readonly queueLength = toSignal(this.#service.queueLength$, { initialValue: 0 });
    readonly slideIndicators = computed(() => Array(this.queueLength()).fill(0));

    constructor() {
        this.#service.currentSlide$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((slide) => {
            this.currentSlide = slide;
            if (slide) {
                requestAnimationFrame(() => {
                    this.panels = this.#computePanels(slide);
                    this.#cdr.markForCheck();
                });
            } else {
                this.panels = null;
            }
            this.#cdr.markForCheck();
        });

        this.#ngZone.runOutsideAngular(() => {
            fromEvent(window, 'resize')
                .pipe(takeUntilDestroyed(this.#destroyRef))
                .subscribe(() => {
                    if (this.currentSlide) {
                        this.panels = this.#computePanels(this.currentSlide);
                        this.#cdr.markForCheck();
                    }
                });
        });
    }

    onNext(): void {
        this.#service.next();
    }

    onDisableChange(checked: boolean): void {
        if (checked) this.#service.disable();
    }

    #resolveElement(slide: GuidedSlide): Element | null {
        if (slide.focusElement) {
            const focusElement = slide.focusElement;
            const el = focusElement instanceof ElementRef ? focusElement.nativeElement : focusElement;
            if (el instanceof Element) return el;
        }
        if (slide.focusSelector) return document.querySelector(slide.focusSelector);
        return null;
    }

    #computePanels(slide: GuidedSlide): OverlayPanels | null {
        const el = this.#resolveElement(slide);
        if (!el) return null;

        const r = el.getBoundingClientRect();
        const sw = window.innerWidth;
        const sh = window.innerHeight;

        const elTop = r.top - PAD;
        const elLeft = r.left - PAD;
        const elRight = r.right + PAD;
        const elBottom = r.bottom + PAD;

        const { style: card, centered: cardCentered } = this.#computeCardPosition(r, sw, sh);
        return {
            top: { top: '0', left: '0', right: '0', height: `${Math.max(0, elTop)}px` },
            bottom: { top: `${Math.min(sh, elBottom)}px`, left: '0', right: '0', bottom: '0' },
            left: { top: `${Math.max(0, elTop)}px`, left: '0', width: `${Math.max(0, elLeft)}px`, height: `${elBottom - elTop}px` },
            right: { top: `${Math.max(0, elTop)}px`, left: `${Math.min(sw, elRight)}px`, right: '0', height: `${elBottom - elTop}px` },
            ring: { top: `${elTop}px`, left: `${elLeft}px`, width: `${elRight - elLeft}px`, height: `${elBottom - elTop}px` },
            card,
            cardCentered,
        };
    }

    #computeCardPosition(r: DOMRect, sw: number, sh: number): { style: Dictionary<string>; centered: boolean } {
        const style: Dictionary<string> = { maxWidth: `${CARD_WIDTH}px` };
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const isWide = r.width > sw * WIDE_THRESHOLD;
        const isTall = r.height > sh * WIDE_THRESHOLD;

        if (isWide) {
            // Element fills most of the width → center the card horizontally
            // and place it above or below depending on where the element is
            style['left'] = '50%';
            if (cy < sh / 2) {
                // element in top half → card below it
                const top = Math.min(sh - CARD_HEIGHT_EST - CARD_MARGIN, r.bottom + PAD + CARD_MARGIN);
                style['top'] = `${top}px`;
            } else {
                // element in bottom half → card above it
                style['bottom'] = `${sh - r.top + PAD + CARD_MARGIN}px`;
            }
            return { style, centered: true };
        }

        // Standard: place horizontally on opposite side of element
        if (cx < sw / 2) {
            style['left'] = `${Math.min(sw - CARD_WIDTH - CARD_MARGIN, r.right + PAD + CARD_MARGIN)}px`;
        } else {
            style['right'] = `${sw - r.left + PAD + CARD_MARGIN}px`;
        }

        // Vertical: center relative to element (or center screen when element is tall)
        if (isTall) {
            style['top'] = '50%';
            return { style, centered: true };
        }

        let top = cy - CARD_HEIGHT_EST / 2;
        top = Math.max(CARD_MARGIN, Math.min(sh - CARD_HEIGHT_EST - CARD_MARGIN, top));
        style['top'] = `${top}px`;
        return { style, centered: false };
    }
}
