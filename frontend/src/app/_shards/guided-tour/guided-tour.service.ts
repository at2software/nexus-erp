import { ElementRef, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface GuidedSlide {
    id: string;
    title?: string;
    content: string;
    /**
     * CSS selector for the element to highlight.
     * Alternative to focusElement — use when you don't have a template ref.
     */
    focusSelector?: string;
    /**
     * Element to highlight — accepts either:
     * - A template variable `#ref` on a plain HTML element (passes native HTMLElement)
     * - An Angular `ElementRef` from @ViewChild
     *
     * Preferred over focusSelector: TypeScript will give a compile error when the
     * referenced template variable is removed, making deprecated slides easy to spot.
     *
     * HTML usage:
     *   <li #dashboardNav>...</li>
     *   <guided-tour [focusElement]="dashboardNav" ...></guided-tour>
     */
    focusElement?: HTMLElement | ElementRef;
}

interface InternalSlide extends GuidedSlide {
    domDepth: number;
}

const SEEN_KEY = 'nexus_guide_seen';
const DISABLED_KEY = 'nexus_guide_disabled';

@Injectable({ providedIn: 'root' })
export class GuidedTourService {

    #seenIds = new Set<string>();
    #disabled = false;
    #queue: InternalSlide[] = [];
    #sessionTotal = 0;
    #sessionDone = 0;

    readonly currentSlide$ = new BehaviorSubject<InternalSlide | null>(null);
    readonly queueLength$ = new BehaviorSubject<number>(0);
    readonly sessionTotal$ = new BehaviorSubject<number>(0);
    readonly sessionDone$ = new BehaviorSubject<number>(0);

    get isDisabled(): boolean { return this.#disabled; }

    constructor() {
        this.#loadFromStorage();
    }

    register(slides: GuidedSlide[], domDepth: number): void {
        if (this.#disabled) return;

        const newSlides: InternalSlide[] = slides
            .filter(s => !this.#seenIds.has(s.id))
            .map(s => ({ ...s, domDepth }));

        if (!newSlides.length) return;

        this.#queue = [...this.#queue, ...newSlides]
            .sort((a, b) => a.domDepth - b.domDepth);

        this.#sessionTotal += newSlides.length;
        this.sessionTotal$.next(this.#sessionTotal);
        this.queueLength$.next(this.#queue.length);

        // If nothing showing yet, show first slide
        if (!this.currentSlide$.value) {
            this.#showCurrent();
        }
    }

    next(): void {
        const current = this.currentSlide$.value;
        if (!current) return;

        this.#markSeen(current.id);
        this.#queue = this.#queue.filter(s => s.id !== current.id);
        this.#sessionDone++;
        this.sessionDone$.next(this.#sessionDone);

        if (this.#queue.length > 0) {
            this.#showCurrent();
        } else {
            this.currentSlide$.next(null);
            this.queueLength$.next(0);
        }
    }

    disable(): void {
        this.#disabled = true;
        localStorage.setItem(DISABLED_KEY, 'true');
        this.#queue = [];
        this.currentSlide$.next(null);
        this.queueLength$.next(0);
    }

    #showCurrent(): void {
        if (!this.#queue.length) return;
        // Update queueLength$ BEFORE currentSlide$ so the overlay reads the correct
        // dot count when its currentSlide$ subscription fires synchronously.
        this.queueLength$.next(this.#queue.length);
        this.currentSlide$.next(this.#queue[0]);
    }

    #markSeen(id: string): void {
        this.#seenIds.add(id);
        localStorage.setItem(SEEN_KEY, JSON.stringify([...this.#seenIds]));
    }

    #loadFromStorage(): void {
        if (localStorage.getItem(DISABLED_KEY) === 'true') {
            this.#disabled = true;
            return;
        }
        const seen = localStorage.getItem(SEEN_KEY);
        if (seen) {
            try {
                this.#seenIds = new Set(JSON.parse(seen));
            } catch { /* ignore corrupt data */ }
        }
    }
}
