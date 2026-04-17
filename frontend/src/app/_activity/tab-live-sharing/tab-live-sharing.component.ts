import { Component, DestroyRef, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ActivityTabComponent } from '../activity-tab.component';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { NexusModule } from '@app/nx/nexus.module';
import { LiveSharingService, ActiveSharing } from '@models/live-sharing.service';
import { WebSocketService } from 'src/services/websocket.service';
import { environment } from 'src/environments/environment';

@Component({
    selector: 'activity-tab-live-sharing',
    standalone: true,
    imports: [ActivityTabComponent, ScrollbarComponent, NexusModule],
    templateUrl: './tab-live-sharing.component.html',
    styleUrls: ['./tab-live-sharing.component.scss']
})
export class TabLiveSharingComponent implements OnInit {

    @ViewChild(ActivityTabComponent) tabComponent!: ActivityTabComponent;
    readonly componentType = TabLiveSharingComponent;

    #liveSharingService = inject(LiveSharingService);
    #wsService = inject(WebSocketService);
    #destroyRef = inject(DestroyRef);

    sharingEnabled = false;
    featureEnabled = false;
    activeSharings: ActiveSharing[] = [];
    wsConnected = false;

    ngOnInit() {
        this.#liveSharingService.featureEnabled$
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe(enabled => this.featureEnabled = enabled);

        this.#liveSharingService.sharingEnabled$
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe(enabled => this.sharingEnabled = enabled);

        this.#liveSharingService.activeSharings$
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe(sharings => {
                this.activeSharings = sharings;
            });

        this.#wsService.connected$
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe(connected => this.wsConnected = connected);
    }

    userIconForSharing(sharing: ActiveSharing): string {
        return environment.envApi + 'users/' + sharing.userId + '/icon';
    }

    toggleSharing() {
        this.#liveSharingService.toggleSharing(!this.sharingEnabled);
    }

    navigateToUser(sharing: ActiveSharing) {
        this.#liveSharingService.navigateToUserUrl(sharing.url);
    }

    getUserInitials(userName: string): string {
        return userName.split(' ')
            .map(part => part[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    }

}
