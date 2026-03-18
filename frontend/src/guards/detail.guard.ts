import { inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { Observable, ReplaySubject, tap } from 'rxjs';
import { GlobalService } from 'src/models/global.service';
import { NexusHttpService } from 'src/models/http/http.nexus';
import { Serializable } from 'src/models/serializable';

@Injectable({ providedIn: 'root' })
export abstract class DetailGuard<T extends Serializable> {

    abstract service: NexusHttpService<any>
    abstract observable: (id: string) => Observable<T>
    protected async onLoaded(_: T) {
        // overridden by children if required
    }

    static lastTitle: string

    onChange = new ReplaySubject<T>(1)
    current: T
    global = inject(GlobalService)
    #router = inject(Router)

    show = (id: string): Observable<T> => this.observable(id).pipe(tap((_: T) => {
		this.current = _
		this.onLoaded(_)
	}))

    reload = () => this.current?.show().subscribe((_: T) => {
        this.onChange.next(_)
    })

    canActivate(route: ActivatedRouteSnapshot): Promise<boolean> | boolean {

        const id = route.paramMap.get('id')

        return new Promise<boolean>(resolve => {
            if (id) {
                this.show(id).subscribe(async (result: T) => {
                    this.onChange.next(result)
                    if (typeof this.current.getName === 'function') {
                        DetailGuard.lastTitle = this.current.getName()
                    }
                    this.global.registerSelectedObject(this.current)
                    resolve(true)
                })
            }
        })
    }

    canActivateChild(route: ActivatedRouteSnapshot): boolean | UrlTree {
        const navData = route.data['nav']

        if (!navData) {
            return true // No nav metadata, allow access
        }

        // Build parent path from all URL segments up to (but not including) the current route
        const pathSegments: string[] = []
        let currentRoute: ActivatedRouteSnapshot | null = route.parent

        while (currentRoute) {
            if (currentRoute.url.length > 0) {
                pathSegments.unshift(...currentRoute.url.map(segment => segment.path))
            }
            currentRoute = currentRoute.parent
        }

        const parentPath = '/' + pathSegments.join('/')

        // Check roles if specified
        if (navData.roles) {
            const requiredRoles = navData.roles.split('|')
            if (!this.global.user?.hasAnyRole(requiredRoles)) {
                return this.#router.parseUrl(parentPath)
            }
        }

        // Check visibility condition if specified
        if (navData.visibleWhen && !navData.visibleWhen(this.current)) {
            return this.#router.parseUrl(parentPath)
        }

        return true
    }

    static routeActivators() {
        return {
            canActivate: [this],
            canActivateChild: [this],
            title: (): string => DetailGuard.lastTitle
        }
    }
}
