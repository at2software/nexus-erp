import './app/custom-interfaces';

class NoopObserver {
    observe(): void { /* jsdom has no layout, so nothing ever changes size or intersects */ }
    unobserve(): void { /* nothing was observed */ }
    disconnect(): void { /* nothing was observed */ }
}

globalThis.ResizeObserver ??= NoopObserver as unknown as typeof ResizeObserver;
globalThis.IntersectionObserver ??= NoopObserver as unknown as typeof IntersectionObserver;
