import { Directive, ElementRef, inject, Input, Renderer2, OnInit, AfterViewInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";

/**
 * This directive keeps track of current sub-routes
 * If using [smartLink] instead of [routerLink], the route will be automatically appended with the sub-route as the default entry point
 * e.g.: if using smartLink="projects/12345", the route will change to "projects/12345/quote", if the quote subpage was the last subpage 
 *       that has been open for "projects/:id" views
 */
@Directive({
    selector: '[smartLink]',
    standalone: true
})
export class SmartLinkDirective implements OnInit, AfterViewInit {

    @Input() smartLink: string
    @Input() routerLinkActiveClass: string = 'active'; // Default active class

    #currentUrl: string
    #url: string
    #el             = inject(ElementRef)
    #renderer       = inject(Renderer2)
    #router         = inject(Router)
    #activatedRoute = inject(ActivatedRoute)

    static singleton: SmartLinkDirective
    static routes: Record<string, string | undefined> = {}

    ngOnInit() {
        if (!SmartLinkDirective.singleton) {
            SmartLinkDirective.singleton = this
        }
        this.#url = SmartLinkDirective.dynamicUrlFor(this.smartLink)
        this.#checkActiveClass()
        this.#router.events.subscribe(() => {
          this.#checkActiveClass()
        });
    }

    #checkActiveClass(): void {
        this.#currentUrl = this.#router.url

        if (this.#isRouteActive(this.#url, this.#currentUrl)) {
            this.#renderer.addClass(this.#el.nativeElement, this.routerLinkActiveClass);
        } else {
            this.#renderer.removeClass(this.#el.nativeElement, this.routerLinkActiveClass);
        }
    }
    #isRouteActive(targetUrl: string, currentUrl: string): boolean {
      return currentUrl.startsWith(targetUrl)
    }

    static getRouteName(routeName: string): { route: string, path: string | undefined } {
        let d: { route: string, path: string | undefined } = { route: routeName, path: undefined }
        d.route = routeName.replace(/\/\d+/, '/:id')
        const parts = d.route.split('/')
        if (parts.length > 2 && parts.last() !== ':id') {
            const subPath = parts.pop()
            d = { route: parts.join('/'), path: subPath }
        }
        return d
    }

    static setSubRoute(route: string, path: string | undefined) {
        this.routes[route] = path
    }

    static dynamicUrlFor(memRoute: string) {
        let url = memRoute
        if (memRoute && memRoute.startsWith('/')) {
            const { route, path } = this.getRouteName(memRoute)
            if (path === undefined && route in this.routes && this.routes[route] !== undefined) {
                url += '/' + SmartLinkDirective.routes[route]
            }
        }
        return url
    }

    ngAfterViewInit() {
        if (this.smartLink) {
            const url = SmartLinkDirective.dynamicUrlFor(this.smartLink)
            this.#renderer.listen(this.#el.nativeElement, 'click', () => {
                this.#router.navigate([url], { relativeTo: this.#activatedRoute })
            })
        }
    }
}