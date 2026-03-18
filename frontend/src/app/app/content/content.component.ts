import { Component, inject, OnDestroy } from '@angular/core';
import { KeycloakService } from 'keycloak-angular';
import { ContinuousScrollComponent } from 'src/app/_shards/continuous/continuous.scroll.component';
import { filter, Subject, takeUntil } from 'rxjs';

@Component({
    selector: 'app-content',
    templateUrl: './content.component.html',
    styleUrls: ['./content.component.scss'],
    standalone: true
})
export class ContentComponent extends ContinuousScrollComponent implements OnDestroy {

    #destroy$ = new Subject<void>()

    protected keycloakService: KeycloakService = inject(KeycloakService)

    constructor() {
        super()
        this.keycloakService.keycloakEvents$
            .pipe(
                takeUntil(this.#destroy$),
                filter(event => event.type === 2)
            )
            .subscribe(() => this.keycloakService.login({ prompt: 'login' }));
    }

    ngOnDestroy() {
        this.#destroy$.next()
        this.#destroy$.complete()
    }
}
