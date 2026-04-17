import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { KeycloakService } from 'keycloak-angular';
import { ContinuousScrollComponent } from 'src/app/_shards/continuous/continuous.scroll.component';
import { filter } from 'rxjs';

@Component({
    selector: 'app-content',
    templateUrl: './content.component.html',
    styleUrls: ['./content.component.scss'],
    standalone: true
})
export class ContentComponent extends ContinuousScrollComponent {

    protected keycloakService: KeycloakService = inject(KeycloakService)

    constructor() {
        super()
        this.keycloakService.keycloakEvents$
            .pipe(
                takeUntilDestroyed(),
                filter(event => event.type === 2)
            )
            .subscribe(() => this.keycloakService.login({ prompt: 'login' }));
    }
}
