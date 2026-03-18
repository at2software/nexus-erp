import { inject, Injectable } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SmartLinkDirective } from 'src/directives/smart-link.directive';

@Injectable({ providedIn: 'root' })
export class RouteChangeListenerService {

    #router = inject(Router)
    
    constructor() {
        this.#listenToRouteChanges()
    }

    #listenToRouteChanges() {
        this.#router.events.pipe(filter((_: any) => _ instanceof NavigationStart))
            .subscribe((event) => {
                const {route, path} = SmartLinkDirective.getRouteName(event.url)
                SmartLinkDirective.setSubRoute(route, path)
        })
    }
}
