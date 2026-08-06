import { inject, signal, Service } from '@angular/core';
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError, NavigationSkipped } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SmartLinkDirective } from '@directives/smart-link.directive';

const OVERLAY_DELAY_MS = 180;

@Service()
export class RouteChangeListenerService {
    #router = inject(Router);

    readonly #navigating = signal(false);
    readonly navigating = this.#navigating.asReadonly();

    #showTimer?: ReturnType<typeof setTimeout>;

    constructor() {
        this.#listenToRouteChanges();
    }

    #listenToRouteChanges() {
        this.#router.events.pipe(filter((_: any) => _ instanceof NavigationStart)).subscribe((event) => {
            const { route, path } = SmartLinkDirective.getRouteName(event.url);
            SmartLinkDirective.setSubRoute(route, path);
        });

        this.#router.events.subscribe((event) => {
            if (event instanceof NavigationStart) {
                clearTimeout(this.#showTimer);
                this.#showTimer = setTimeout(() => this.#navigating.set(true), OVERLAY_DELAY_MS);
            } else if (
                event instanceof NavigationEnd ||
                event instanceof NavigationCancel ||
                event instanceof NavigationError ||
                event instanceof NavigationSkipped
            ) {
                clearTimeout(this.#showTimer);
                this.#navigating.set(false);
            }
        });
    }
}
