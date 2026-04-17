import { afterNextRender, Directive, effect, ElementRef, inject, Injector, input, OnInit, Renderer2 } from "@angular/core";
import { ActivatedRoute, NavigationEnd, Router } from "@angular/router";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { DestroyRef } from "@angular/core";
import { filter } from "rxjs";

/**
 * This directive keeps track of current sub-routes.
 * If using [smartLink] instead of [routerLink], the route will be automatically appended with the sub-route as the default entry point.
 * e.g.: if using smartLink="projects/12345", the route will change to "projects/12345/quote", if the quote subpage was the last subpage
 *       that has been open for "projects/:id" views
 */
@Directive({
    selector: '[smartLink]',
    standalone: true
})
export class SmartLinkDirective implements OnInit {

    readonly smartLink           = input.required<string>()
    readonly routerLinkActiveClass = input<string>('active')

    readonly #el             = inject(ElementRef)
    readonly #renderer       = inject(Renderer2)
    readonly #router         = inject(Router)
    readonly #activatedRoute = inject(ActivatedRoute)
    readonly #destroyRef     = inject(DestroyRef)
    readonly #injector       = inject(Injector)

    static singleton: SmartLinkDirective
    static routes: Record<string, string | undefined> = {}

    constructor() {
        if (!SmartLinkDirective.singleton) SmartLinkDirective.singleton = this

        afterNextRender(() => {
            this.#renderer.listen(this.#el.nativeElement, 'click', () => {
                this.#router.navigate(
                    [SmartLinkDirective.dynamicUrlFor(this.smartLink())],
                    { relativeTo: this.#activatedRoute }
                )
            })
        })
    }

    ngOnInit() {
        this.#router.events.pipe(
            filter(e => e instanceof NavigationEnd),
            takeUntilDestroyed(this.#destroyRef)
        ).subscribe(() => this.#checkActiveClass())

        effect(() => {
            const url = SmartLinkDirective.dynamicUrlFor(this.smartLink())
            this.#checkActiveClass(url)
        }, { injector: this.#injector })
    }

    #checkActiveClass(url = SmartLinkDirective.dynamicUrlFor(this.smartLink())) {
        const active = this.#router.url.startsWith(url)
        const method = active ? 'addClass' : 'removeClass'
        this.#renderer[method](this.#el.nativeElement, this.routerLinkActiveClass())
    }

    static getRouteName(routeName: string): { route: string, path: string | undefined } {
        const route = routeName.replace(/\/\d+/, '/:id')
        const parts = route.split('/')
        if (parts.length > 2 && parts.last() !== ':id') {
            const path = parts.pop()
            return { route: parts.join('/'), path }
        }
        return { route, path: undefined }
    }

    static setSubRoute(route: string, path: string | undefined) {
        this.routes[route] = path
    }

    static dynamicUrlFor(memRoute: string): string {
        if (!memRoute?.startsWith('/')) return memRoute
        const { route, path } = this.getRouteName(memRoute)
        if (path === undefined && route in this.routes && this.routes[route] !== undefined) {
            return memRoute + '/' + this.routes[route]
        }
        return memRoute
    }
}
