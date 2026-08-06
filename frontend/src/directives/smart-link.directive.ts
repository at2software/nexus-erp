import { Dictionary } from '@constants/constants';
import { afterNextRender, Directive, effect, ElementRef, inject, input, Renderer2 } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';

@Directive({
    selector: '[smartLink]',
})
export class SmartLinkDirective {
    readonly smartLink = input.required<string>();
    readonly routerLinkActiveClass = input<string>('active');

    readonly #el = inject(ElementRef);
    readonly #renderer = inject(Renderer2);
    readonly #router = inject(Router);
    readonly #activatedRoute = inject(ActivatedRoute);

    readonly #navigatedTo = toSignal(this.#router.events.pipe(filter((e) => e instanceof NavigationEnd)));

    static singleton: SmartLinkDirective;
    static routes: Dictionary<string | undefined> = {};

    constructor() {
        if (!SmartLinkDirective.singleton) SmartLinkDirective.singleton = this;

        afterNextRender(() => {
            this.#renderer.listen(this.#el.nativeElement, 'click', () => {
                this.#router.navigate([SmartLinkDirective.dynamicUrlFor(this.smartLink())], { relativeTo: this.#activatedRoute });
            });
        });

        effect(() => {
            this.#navigatedTo();
            this.#checkActiveClass(SmartLinkDirective.dynamicUrlFor(this.smartLink()));
        });
    }

    #checkActiveClass(url = SmartLinkDirective.dynamicUrlFor(this.smartLink())) {
        const active = this.#router.url.startsWith(url);
        const method = active ? 'addClass' : 'removeClass';
        this.#renderer[method](this.#el.nativeElement, this.routerLinkActiveClass());
    }

    static getRouteName(routeName: string): { route: string; path: string | undefined } {
        const route = routeName.replace(/\/\d+/, '/:id');
        const parts = route.split('/');
        if (parts.length > 2 && parts.last() !== ':id') {
            const path = parts.pop();
            return { route: parts.join('/'), path };
        }
        return { route, path: undefined };
    }

    static setSubRoute(route: string, path: string | undefined) {
        this.routes[route] = path;
    }

    static dynamicUrlFor(memRoute: string): string {
        if (!memRoute?.startsWith('/')) return memRoute;
        const { route, path } = this.getRouteName(memRoute);
        if (path === undefined && route in this.routes && this.routes[route] !== undefined) {
            return memRoute + '/' + this.routes[route];
        }
        return memRoute;
    }
}
