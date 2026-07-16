import { AfterViewInit, Directive, ElementRef, NgZone, OnDestroy, inject } from '@angular/core';

@Directive({
    selector: '[revealList]',
    standalone: true,
})
export class RevealListDirective implements AfterViewInit, OnDestroy {
    readonly #el = inject(ElementRef<HTMLElement>);
    readonly #zone = inject(NgZone);

    #observer?: MutationObserver;
    #raf = 0;
    #lastHeight = 0;
    #animated = new WeakSet<Element>();

    ngAfterViewInit(): void {
        const host = this.#el.nativeElement;
        this.#lastHeight = host.getBoundingClientRect().height;

        this.#zone.runOutsideAngular(() => {
            this.#observer = new MutationObserver((mutations) => {
                const hasListChanges = mutations.some((m) => m.type === 'childList' || m.type === 'characterData');
                if (hasListChanges) this.#scheduleAnimation();
            });

            this.#observer.observe(host, {
                childList: true,
                subtree: true,
                characterData: true,
            });
        });
    }

    ngOnDestroy(): void {
        if (this.#raf) cancelAnimationFrame(this.#raf);
        this.#observer?.disconnect();
    }

    #scheduleAnimation(): void {
        if (this.#raf) cancelAnimationFrame(this.#raf);

        const host = this.#el.nativeElement;
        const startHeight = this.#lastHeight || host.getBoundingClientRect().height;

        this.#raf = requestAnimationFrame(() => {
            this.#raf = 0;
            const endHeight = host.getBoundingClientRect().height;

            if (Math.abs(endHeight - startHeight) > 1) {
                host.style.overflow = 'hidden';
                host.animate(
                    [
                        { height: `${startHeight}px` },
                        { height: `${endHeight}px` },
                    ],
                    {
                        duration: 260,
                        easing: 'cubic-bezier(0.2, 0, 0, 1)',
                    }
                ).onfinish = () => {
                    host.style.overflow = '';
                    host.style.height = '';
                };
            }

            const rows = host.querySelectorAll('li, tbody > tr, tr') as NodeListOf<HTMLElement>;
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                if (this.#animated.has(row)) continue;
                this.#animated.add(row);
                row.animate(
                    [
                        { opacity: 0, transform: 'translateY(6px)' },
                        { opacity: 1, transform: 'translateY(0)' },
                    ],
                    {
                        duration: 220,
                        easing: 'ease-out',
                        fill: 'both',
                        delay: Math.min(i * 24, 140),
                    }
                );
            }

            this.#lastHeight = endHeight;
        });
    }
}
