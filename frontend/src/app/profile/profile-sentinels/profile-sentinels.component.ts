import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { ActionEmitterType } from '@app/nx/nx.directive';
import { Sentinel } from '@models/sentinels/sentinel.model';
import { SentinelService } from '@models/sentinels/sentinel.service';
import { Nx } from '@app/nx/nx.directive';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';

@Component({
    selector: 'profile-sentinels',
    templateUrl: './profile-sentinels.component.html',
    imports: [ToolbarComponent, Nx, RouterModule, NgbTooltipModule, EmptyStateComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileSentinelsComponent {
    #sentinelService = inject(SentinelService);
    #router = inject(Router);

    sentinels = signal<Sentinel[]>([]);

    constructor() {
        this.#reload();
    }

    #reload = () => this.#sentinelService.index().subscribe((_) => this.sentinels.set(_));

    store = () =>
        new Sentinel().store().subscribe((_) => {
            this.#reload();
            this.#router.navigate(['profile', 'sentinels', _.id]);
        });

    nxResolve(e: ActionEmitterType) {
        if (e.action.title == 'Delete') {
            this.#reload();
            this.#router.navigate(['profile', 'sentinels']);
        }
    }
}
