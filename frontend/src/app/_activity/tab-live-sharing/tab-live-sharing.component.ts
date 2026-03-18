import { Component, inject, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivityTabComponent } from '../activity-tab.component';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { NexusModule } from '@app/nx/nexus.module';
import { LiveSharingService, ActiveSharing } from '@models/live-sharing.service';
import { WebSocketService } from 'src/services/websocket.service';
import { Subject, takeUntil } from 'rxjs';
import { environment } from 'src/environments/environment';

@Component({
    selector: 'activity-tab-live-sharing',
    standalone: true,
    imports: [ActivityTabComponent, ScrollbarComponent, NexusModule, CommonModule],
    templateUrl: './tab-live-sharing.component.html',
    styleUrls: ['./tab-live-sharing.component.scss']
})
export class TabLiveSharingComponent implements OnInit, OnDestroy {

    @ViewChild(ActivityTabComponent) tabComponent!: ActivityTabComponent;
    readonly componentType = TabLiveSharingComponent;

    #liveSharingService = inject(LiveSharingService);
    #wsService = inject(WebSocketService);
    #destroy$ = new Subject<void>();

    sharingEnabled = false;
    featureEnabled = false;
    activeSharings: ActiveSharing[] = [];
    wsConnected = false;

    ngOnInit() {
        this.#liveSharingService.featureEnabled$
            .pipe(takeUntil(this.#destroy$))
            .subscribe(enabled => this.featureEnabled = enabled);

        this.#liveSharingService.sharingEnabled$
            .pipe(takeUntil(this.#destroy$))
            .subscribe(enabled => this.sharingEnabled = enabled);

        this.#liveSharingService.activeSharings$
            .pipe(takeUntil(this.#destroy$))
            .subscribe(sharings => {
                this.activeSharings = sharings;
            });

        this.#wsService.connected$
            .pipe(takeUntil(this.#destroy$))
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

    ngOnDestroy() {
        this.#destroy$.next();
        this.#destroy$.complete();
    }
}
