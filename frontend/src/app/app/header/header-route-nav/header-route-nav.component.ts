import { Component, effect, inject, input, OnDestroy } from '@angular/core';
import { ActivatedRoute, Route, RouterModule } from '@angular/router';
import { GlobalService } from '@models/global.service';
import { HeaderLinkItemComponent } from '../header-link-item/header-link-item.component';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { Observable, Subscription } from 'rxjs';

export interface NavRouteData {
    title: string
    roles?: string
    exact?: boolean
    visibleWhen?: (context: any) => boolean
}

export interface ProcessedRoute {
    path: string
    title: string
    exact: boolean
    children?: ProcessedRoute[]
    hasChildren: boolean
}

@Component({
    selector: 'header-route-nav',
    templateUrl: './header-route-nav.component.html',
    styleUrls: ['./header-route-nav.component.scss'],
    standalone: true,
    imports: [HeaderLinkItemComponent, NgbDropdownModule, RouterModule]
})
export class HeaderRouteNavComponent implements OnDestroy {

    context = input.required<any>();
    routeConfig = input<Route | null>();
    onChange = input<Observable<any> | undefined>();

    #route = inject(ActivatedRoute)
    #global = inject(GlobalService)
    #subscription?: Subscription

    routes: ProcessedRoute[] = []

    constructor() {
        effect(() => {
            this.context()
            this.routeConfig()
            this.#subscription?.unsubscribe()
            this.#subscription = this.onChange()?.subscribe(() => this.#updateRoutes())
            this.#updateRoutes()
        })
    }

    ngOnDestroy(): void {
        this.#subscription?.unsubscribe()
    }

    #updateRoutes() {
        const routes = (this.routeConfig() ?? this.#route.routeConfig)?.children || []

        this.routes = routes
            .filter(route => route.data?.['nav'])
            .filter(route => {
                const navData = route.data!['nav'] as NavRouteData
                // Check role permission
                if (navData.roles) {
                    const requiredRoles = navData.roles.split('|')
                    if (!this.#global.user?.hasAnyRole(requiredRoles)) {
                        return false
                    }
                }
                if (navData.visibleWhen && !navData.visibleWhen(this.context())) {
                    return false
                }
                return true
            })
            .map(route => this.#processRoute(route))
    }

    #processRoute(route: Route): ProcessedRoute {
        const navData = route.data!['nav'] as NavRouteData
        const children = this.#processChildren(route.children || [])
        
        return {
            path: route.path || '.',
            title: navData.title,
            exact: navData.exact ?? true,
            children: children.length > 0 ? children : undefined,
            hasChildren: children.length > 0
        }
    }

    #processChildren(children: Route[]): ProcessedRoute[] {
        return children
            .filter(child => child.data?.['nav'])
            .filter(child => {
                const navData = child.data!['nav'] as NavRouteData
                // Check role permission
                if (navData.roles) {
                    const requiredRoles = navData.roles.split('|')
                    if (!this.#global.user?.hasAnyRole(requiredRoles)) {
                        return false
                    }
                }
                if (navData.visibleWhen && !navData.visibleWhen(this.context())) {
                    return false
                }
                return true
            })
            .map(child => this.#processRoute(child))
    }
}
