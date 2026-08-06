import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { ActivatedRoute, Route, RouterModule } from '@angular/router';
import { GlobalService } from '@models/global.service';
import { HeaderLinkItemComponent } from '../header-link-item/header-link-item.component';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { Observable } from 'rxjs';

export interface NavRouteData {
    title: string;
    roles?: string;
    exact?: boolean;
    visibleWhen?: (context: unknown) => boolean;
}

export interface ProcessedRoute {
    path: string;
    title: string;
    exact: boolean;
    children?: ProcessedRoute[];
    hasChildren: boolean;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'header-route-nav',
    templateUrl: './header-route-nav.component.html',
    styleUrls: ['./header-route-nav.component.scss'],
    imports: [HeaderLinkItemComponent, NgbDropdownModule, RouterModule],
})
export class HeaderRouteNavComponent {
    context = input.required<unknown>();
    routeConfig = input<Route | null>();
    onChange = input<Observable<unknown> | undefined>();

    #route = inject(ActivatedRoute);
    #global = inject(GlobalService);

    routes = signal<ProcessedRoute[]>([]);

    constructor() {
        effect((onCleanup) => {
            this.context();
            this.routeConfig();
            const subscription = this.onChange()?.subscribe(() => this.#updateRoutes());
            onCleanup(() => subscription?.unsubscribe());
            this.#updateRoutes();
        });
    }

    #updateRoutes() {
        const routes = (this.routeConfig() ?? this.#route.routeConfig)?.children || [];

        this.routes.set(
            routes
                .filter((route) => route.data?.['nav'])
                .filter((route) => {
                    const navData = route.data!['nav'] as NavRouteData;
                    if (navData.roles) {
                        const requiredRoles = navData.roles.split('|');
                        if (!this.#global.user?.hasAnyRole(requiredRoles)) {
                            return false;
                        }
                    }
                    if (navData.visibleWhen && !navData.visibleWhen(this.context())) {
                        return false;
                    }
                    return true;
                })
                .map((route) => this.#processRoute(route)),
        );
    }

    #processRoute(route: Route): ProcessedRoute {
        const navData = route.data!['nav'] as NavRouteData;
        const children = this.#processChildren(route.children || []);

        return {
            path: route.path || '.',
            title: navData.title,
            exact: navData.exact ?? true,
            children: children.length > 0 ? children : undefined,
            hasChildren: children.length > 0,
        };
    }

    #processChildren(children: Route[]): ProcessedRoute[] {
        return children
            .filter((child) => child.data?.['nav'])
            .filter((child) => {
                const navData = child.data!['nav'] as NavRouteData;
                if (navData.roles) {
                    const requiredRoles = navData.roles.split('|');
                    if (!this.#global.user?.hasAnyRole(requiredRoles)) {
                        return false;
                    }
                }
                if (navData.visibleWhen && !navData.visibleWhen(this.context())) {
                    return false;
                }
                return true;
            })
            .map((child) => this.#processRoute(child));
    }
}
