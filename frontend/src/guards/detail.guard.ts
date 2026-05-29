import { inject, Injectable, Signal, signal } from '@angular/core';
import { ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { firstValueFrom, Observable, tap } from 'rxjs';
import { GlobalService } from '@models/global.service';
import { NexusHttpService } from '@models/http/http.nexus';
import { Serializable } from '@models/serializable';

@Injectable({ providedIn: 'root' })
export abstract class DetailGuard<T extends Serializable> {

    #global = inject(GlobalService);
    #router = inject(Router);

    abstract service: NexusHttpService<any>;
    abstract observable: (id: string) => Observable<T>;
    protected onBeforeLoad() { /** overridden by children */ }
    protected async onLoaded(_: T) { /** overridden by children */ }

    static lastTitle: string;

    #objectSignal = signal<T>(null as unknown as T);
    readonly object: Signal<T> = this.#objectSignal.asReadonly();

    show = (id: string): Observable<T> => {
        this.onBeforeLoad();
        return this.observable(id).pipe(
            tap((_: T) => {
                this.#objectSignal.set(_);
                this.onLoaded(_);
            }),
        );
    };

    reload = () =>
        this.object()?.refresh().subscribe((_: T) => {
            this.#objectSignal.set(_);
            this.onLoaded(_);
        });

    async canActivate(route: ActivatedRouteSnapshot): Promise<boolean> {
        const id = route.paramMap.get('id');
        if (!id) return false;
        try {
            const result = await firstValueFrom(this.show(id));
            if (typeof result.getName === 'function') {
                DetailGuard.lastTitle = result.getName();
            }
            this.#global.registerSelectedObject(result);
            return true;
        } catch {
            return false;
        }
    }

    canActivateChild(route: ActivatedRouteSnapshot): boolean | UrlTree {
        const navData = route.data['nav'];

        if (!navData) {
            return true;
        }

        const pathSegments: string[] = [];
        let currentRoute: ActivatedRouteSnapshot | null = route.parent;

        while (currentRoute) {
            if (currentRoute.url.length > 0) {
                pathSegments.unshift(...currentRoute.url.map((segment) => segment.path));
            }
            currentRoute = currentRoute.parent;
        }

        const parentPath = '/' + pathSegments.join('/');

        if (navData.roles) {
            const requiredRoles = navData.roles.split('|');
            if (!this.#global.user?.hasAnyRole(requiredRoles)) {
                return this.#router.parseUrl(parentPath);
            }
        }

        if (navData.visibleWhen && !navData.visibleWhen(this.object())) {
            return this.#router.parseUrl(parentPath);
        }
        return true;
    }

    static routeActivators() {
        return {
            canActivate: [this],
            canActivateChild: [this],
            title: (): string => DetailGuard.lastTitle,
        };
    }
}
