import {
    ChangeDetectionStrategy, ChangeDetectorRef, Component,
    HostListener, inject, OnDestroy, OnInit
} from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { GuidedSlide, GuidedTourService } from './guided-tour.service';
import { Subscription } from 'rxjs';

interface OverlayPanels {
    top: Record<string, string>;
    bottom: Record<string, string>;
    left: Record<string, string>;
    right: Record<string, string>;
    ring: Record<string, string>;
    card: Record<string, string>;
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
    standalone: true,
    imports: [AsyncPipe],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class GuidedTourOverlayComponent implements OnInit, OnDestroy {

    #service = inject(GuidedTourService);
    #cdr = inject(ChangeDetectorRef);
    #sub?: Subscription;

    currentSlide: GuidedSlide | null = null;
    panels: OverlayPanels | null = null;
    disableChecked = false;

    get queueLength$() { return this.#service.queueLength$; }
    get sessionTotal$() { return this.#service.sessionTotal$; }
    get sessionDone$() { return this.#service.sessionDone$; }

    get slideIndicators(): number[] {
        return Array(this.#service.queueLength$.value).fill(0);
    }

    ngOnInit(): void {
        this.#sub = this.#service.currentSlide$.subscribe(slide => {
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
    }

    ngOnDestroy(): void {
        this.#sub?.unsubscribe();
    }

    @HostListener('window:resize')
    onResize(): void {
        if (this.currentSlide) {
            this.panels = this.#computePanels(this.currentSlide);
            this.#cdr.markForCheck();
        }
    }

    onNext(): void {
        this.#service.next();
    }

    onDisableChange(checked: boolean): void {
        if (checked) this.#service.disable();
    }

    #resolveElement(slide: GuidedSlide): Element | null {
        if (slide.focusElement) {
            const el = (slide.focusElement as any).nativeElement ?? slide.focusElement;
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

        const elTop    = r.top    - PAD;
        const elLeft   = r.left   - PAD;
        const elRight  = r.right  + PAD;
        const elBottom = r.bottom + PAD;

        const { style: card, centered: cardCentered } = this.#computeCardPosition(r, sw, sh);
        return {
            top:    { top: '0', left: '0', right: '0', height: `${Math.max(0, elTop)}px` },
            bottom: { top: `${Math.min(sh, elBottom)}px`, left: '0', right: '0', bottom: '0' },
            left:   { top: `${Math.max(0, elTop)}px`, left: '0', width: `${Math.max(0, elLeft)}px`, height: `${elBottom - elTop}px` },
            right:  { top: `${Math.max(0, elTop)}px`, left: `${Math.min(sw, elRight)}px`, right: '0', height: `${elBottom - elTop}px` },
            ring:   { top: `${elTop}px`, left: `${elLeft}px`, width: `${elRight - elLeft}px`, height: `${elBottom - elTop}px` },
            card,
            cardCentered
        };
    }

    #computeCardPosition(r: DOMRect, sw: number, sh: number): { style: Record<string, string>, centered: boolean } {
        const style: Record<string, string> = { maxWidth: `${CARD_WIDTH}px` };
        const cx = r.left + r.width  / 2;
        const cy = r.top  + r.height / 2;
        const isWide = r.width  > sw * WIDE_THRESHOLD;
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
