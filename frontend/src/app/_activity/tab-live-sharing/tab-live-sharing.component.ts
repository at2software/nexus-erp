import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivityTabComponent } from '../activity-tab.component';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { LiveSharingService, ActiveSharing } from '@models/live-sharing.service';
import { WebSocketService } from 'src/services/websocket.service';
import { environment } from 'src/environments/environment';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'activity-tab-live-sharing',
    standalone: true,
    imports: [ActivityTabComponent, ScrollbarComponent],
    templateUrl: './tab-live-sharing.component.html',
    styleUrls: ['./tab-live-sharing.component.scss'],
})
export class TabLiveSharingComponent {

    #liveSharingService = inject(LiveSharingService);
    #wsService = inject(WebSocketService);

    readonly componentType = TabLiveSharingComponent;
    readonly featureEnabled = toSignal(this.#liveSharingService.featureEnabled$, { initialValue: false });
    readonly sharingEnabled = toSignal(this.#liveSharingService.sharingEnabled$, { initialValue: false });
    readonly activeSharings = toSignal(this.#liveSharingService.activeSharings$, { initialValue: [] as ActiveSharing[] });
    readonly wsConnected = toSignal(this.#wsService.connected$, { initialValue: false });

    userIconForSharing = (sharing: ActiveSharing): string => environment.envApi + 'users/' + sharing.userId + '/icon';
    toggleSharing = () => this.#liveSharingService.toggleSharing(!this.sharingEnabled());
    navigateToUser = (sharing: ActiveSharing) => this.#liveSharingService.navigateToUserUrl(sharing.url);
    getUserInitials = (userName: string): string => userName
        .split(' ')
        .map((part) => part[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
}
