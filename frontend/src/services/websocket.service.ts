import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { environment } from 'src/environments/environment';
import { AuthenticationService } from '@models/auth.service';
import { GlobalService } from '@models/global.service';

declare global {
    interface Window {
        Pusher: any;
        Echo: any;
    }
}

export interface MousePosition {
    userId: string;
    userName: string;
    userColor: string;
    x: number;
    y: number;
    url: string;
    visible?: boolean;
    message?: string;
}

export interface MouseClick {
    userId: string;
    userColor: string;
    x: number;
    y: number;
    url: string;
}

export interface QuickMessage {
    userId: string;
    message: string;
}

export interface SharingStatus {
    userId: string;
    userName: string;
    userColor: string;
    enabled: boolean;
    url: string;
    visible?: boolean;
}

@Injectable({ providedIn: 'root' })
export class WebSocketService {

    #auth = inject(AuthenticationService);
    #global = inject(GlobalService);

    echo: Echo<any> | null = null;
    connected$ = new BehaviorSubject<boolean>(false);
    mousePositions$ = new Subject<MousePosition>();
    sharingToggled$ = new Subject<SharingStatus>();
    visibilityChanged$ = new Subject<{ userId: string; visible: boolean; url: string }>();
    mouseClicks$ = new Subject<MouseClick>();
    quickMessages$ = new Subject<QuickMessage>();

    constructor() {
        window.Pusher = Pusher;
        this.#global.init.subscribe(() => this.connect());
    }

    async connect() {
        if (this.echo) return;

        const token = this.#auth.apiToken || this.#getCookie('api_token') || localStorage.getItem('token') || (await this.#getKeycloakToken());
        const reverbKey = AuthenticationService.sysinfo?.reverb_key || environment.reverbKey;

        const useTLS = environment.production
            ? window.location.protocol === 'https:'
            : environment.reverbScheme === 'https';
        const host = environment.production ? window.location.hostname : environment.reverbHost;
        const port = environment.production
            ? (parseInt(window.location.port) || (useTLS ? 443 : 80))
            : environment.reverbPort;

        this.echo = new Echo({
            broadcaster: 'reverb',
            key: reverbKey,
            wsHost: host,
            wssHost: host,
            wsPort: port,
            wssPort: port,
            forceTLS: useTLS,
            enabledTransports: useTLS ? ['wss'] : ['ws'],
            authEndpoint: environment.envApi + 'broadcasting/auth',
            auth: {
                headers: { 'Authorization': `Bearer ${token}` }
            }
        });

        this.echo.connector.pusher.connection.bind('connected', () => {
            this.connected$.next(true);
        });

        this.echo.connector.pusher.connection.bind('disconnected', () => {
            this.connected$.next(false);
        });

        this.echo.connector.pusher.connection.bind('state_change', (states: { current: string }) => {
            if (states.current === 'unavailable' || states.current === 'failed') {
                this.disconnect();
            }
        });

        this.#listenToLiveSharingChannel();
    }

    #listenToLiveSharingChannel() {
        const channel = this.echo?.join('live-sharing');
        channel?.listen('.sharing.toggled', (data: SharingStatus) => {
            this.sharingToggled$.next(data);
        });
        channel?.listenForWhisper('mouse-position', (data: MousePosition) => {
            this.mousePositions$.next(data);
        });
        channel?.listenForWhisper('visibility-changed', (data: { userId: string; visible: boolean; url: string }) => {
            this.visibilityChanged$.next(data);
        });
        channel?.listenForWhisper('mouse-click', (data: MouseClick) => {
            this.mouseClicks$.next(data);
        });
        channel?.listenForWhisper('quick-message', (data: QuickMessage) => {
            this.quickMessages$.next(data);
        });
    }

    sendMousePosition(x: number, y: number, url: string, visible: boolean = true) {
        if (!this.echo || !this.connected$.value) return;

        const user = this.#global.user;
        if (!user) return;

        this.echo.join('live-sharing').whisper('mouse-position', {
            userId: user.id,
            userName: user.name,
            userColor: user.color || '#3B82F6',
            x,
            y,
            url,
            visible
        });
    }

    sendVisibilityStatus(visible: boolean, url: string) {
        if (!this.echo || !this.connected$.value) return;

        const user = this.#global.user;
        if (!user) return;

        this.echo.join('live-sharing').whisper('visibility-changed', {
            userId: user.id,
            visible,
            url
        });
    }

    sendMouseClick(x: number, y: number, url: string) {
        if (!this.echo || !this.connected$.value) return;

        const user = this.#global.user;
        if (!user) return;

        this.echo.join('live-sharing').whisper('mouse-click', {
            userId: user.id,
            userColor: user.color || '#3B82F6',
            x,
            y,
            url
        });
    }

    sendQuickMessage(message: string) {
        if (!this.echo || !this.connected$.value || !this.#global.user) return;

        this.echo.join('live-sharing').whisper('quick-message', {
            userId: this.#global.user.id,
            message
        });
    }

    #getCookie(name: string): string | null {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
        return null;
    }

    async #getKeycloakToken(): Promise<string | null> {
        if (AuthenticationService.keycloak) {
            try {
                await AuthenticationService.keycloak.updateToken(30);
                return AuthenticationService.keycloak.token || null;
            } catch (error) {
                console.error('Failed to refresh Keycloak token', error);
                return null;
            }
        }
        return null;
    }

    disconnect() {
        if (this.echo) {
            this.echo.disconnect();
            this.echo = null;
            this.connected$.next(false);
        }
    }
}
