import { Component, inject, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { ActivatedRoute, Route } from '@angular/router';
import { GlobalService } from '@models/global.service';
import { HeaderLinkItemComponent } from '../header-link-item/header-link-item.component';
import { Observable, Subscription } from 'rxjs';

export interface NavRouteData {
    title: string
    roles?: string
    exact?: boolean
    visibleWhen?: (context: any) => boolean
}

@Component({
    selector: 'header-route-nav',
    templateUrl: './header-route-nav.component.html',
    styleUrls: ['./header-route-nav.component.scss'],
    standalone: true,
    imports: [HeaderLinkItemComponent]
})
export class HeaderRouteNavComponent implements OnChanges, OnInit, OnDestroy {

    @Input({ required: true }) context: any
    @Input({ required: false }) routeConfig?: Route | null
    @Input() onChange?: Observable<any>

    #route = inject(ActivatedRoute)
    #global = inject(GlobalService)
    #subscription?: Subscription

    routes: any[] = []

    ngOnInit(): void {
        if (this.onChange) {
            this.#subscription = this.onChange.subscribe(() => {
                this.#updateRoutes()
            })
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['context'] || changes['routeConfig']) {
            this.#updateRoutes()
        }
    }

    ngOnDestroy(): void {
        this.#subscription?.unsubscribe()
    }

    #updateRoutes() {
        const routes = (this.routeConfig ?? this.#route.routeConfig)?.children || []

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
                if (navData.visibleWhen && !navData.visibleWhen(this.context)) {
                    return false
                }
                return true
            })
            .map(route => {
                const navData = route.data!['nav'] as NavRouteData
                return {
                    path: route.path || '.',
                    title: navData.title,
                    exact: navData.exact ?? true
                }
            })
    }
}
