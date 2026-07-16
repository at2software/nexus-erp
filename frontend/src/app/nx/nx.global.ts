import { Injector, ProviderToken } from '@angular/core';
import { Router } from '@angular/router';
import { Dictionary } from '@constants/constants';
import { Serializable } from '@models/serializable';
import { GlobalService } from '@models/global.service';
import { NexusHttp } from '@models/http/http.nexus';
import { NxService } from './nx.service';
import { HttpClient } from '@angular/common/http';
import { Title } from '@angular/platform-browser';
import { SmartLinkDirective } from '@directives/smart-link.directive';
import { Subject } from 'rxjs';
import { getCookie } from '@constants/cookies';
import { objectMap, objectRemoveEmpty } from '@constants/objectMap';
import { NxActionType } from './nx.actions';
import { ModalConfirmComponent } from '@app/_modals/modal-confirm/modal-confirm.component';
import { ModalBaseService } from '@app/_modals/modal-base-service';
import { ModalInputComponent, ModalInputArgs, ModalInputResult } from '@app/_modals/modal-input/modal-input.component';
import { Toast } from '@app/_shards/toast/toast';
import { tap } from 'rxjs';

type TClipDict<T> = Dictionary<T[]>;

export enum TBroadcast {
    Update,
    Delete,
}
interface BroadcastPayload {
    type: TBroadcast;
    data: Serializable;
}

/** Main helper class — exposes services and state statically to classes outside the injector */
export class NxGlobal {
    static service: NexusHttp;
    static http: HttpClient;
    static router: Router;
    static injector: Injector;
    static global: GlobalService;
    static nxService: NxService;
    static ME_ID: string;
    static title: Title;
    static currentTitle?: string;
    static context?: Serializable;
    static modalService: ModalBaseService;
    static MODEL_REGISTRY_TOKEN: Dictionary<typeof Serializable>;

    static #eventSubject = new Subject<BroadcastPayload>();
    static broadcast$ = this.#eventSubject.asObservable();
    static broadcast = (data: BroadcastPayload) => this.#eventSubject.next(data);

    static #dashboardEditSubject = new Subject<boolean>();
    static dashboardEditMode$ = this.#dashboardEditSubject.asObservable();
    static setDashboardEditMode = (editing: boolean) => this.#dashboardEditSubject.next(editing);

    static #clips: TClipDict<Serializable> = {};
    static #currentRoot?: Serializable;
    static #clipboardSubject = new Subject<boolean>();
    static onClipboardChanged = this.#clipboardSubject.asObservable();

    static clip(object: Serializable): void {
        if (!(object.class in this.#clips)) this.#clips[object.class] = [];
        if (!this.#clips[object.class].find((_) => _.id == object.id)) {
            this.#clips[object.class].push(object);
            this.#updateClipboardCookies();
        }
        this.#emitClipboard();
    }

    static unclip(object: Serializable): void {
        if (!(object.class in this.#clips)) this.#clips[object.class] = [];
        const existing = this.#clips[object.class].find((_) => _.id == object.id);
        if (existing) {
            this.#clips[object.class].remove(existing);
            this.#updateClipboardCookies();
        }
        this.#emitClipboard();
    }

    static unclipAll = (className: string) => {
        this.#clips[className] = [];
        this.#clips = objectRemoveEmpty(this.#clips);
        this.#updateClipboardCookies();
        this.#emitClipboard();
    };

    static hasClip = (_: Serializable) =>
        (this.#clips[_.class] ?? []).findIndex((x) => x.apiPathWithId() === _.apiPathWithId()) !== -1;

    static deleteAction(self: Serializable, message: string, options?: { roles?: string | null; on?: () => boolean; action?: () => void }) {
        // When the action is role-gated and the current user lacks those roles, offer a
        // "request deletion" alternative instead of hiding the action entirely: the user
        // gives a reason and a DeletionRequest is created for an admin to approve.
        const roles = (options?.roles ?? '').split('|').map((r) => r.trim()).filter(Boolean);
        if (roles.length && !(NxGlobal.global.user?.hasAnyRole(roles) ?? false)) {
            return {
                title: $localize`:@@i18n.common.requestDeletion:request deletion`,
                interrupt: {
                    service: ModalInputComponent,
                    args: {
                        title: $localize`:@@i18n.common.requestDeletion:request deletion`,
                        message: $localize`:@@i18n.common.requestDeletionReason:Why should this be deleted?`,
                    } satisfies ModalInputArgs,
                },
                action: (_success?: (v: unknown) => void, _ctx?: unknown, result?: ModalInputResult) => {
                    if (!result?.text) return undefined;
                    return NxGlobal.service
                        .post('deletion_requests', { model_type: self.getModelName(), model_id: self.id, reason: result.text })
                        .pipe(tap(() => Toast.success($localize`:@@i18n.common.deletionRequested:Deletion requested`)));
                },
                type: NxActionType.Destructive,
                group: true,
                ...(options?.on ? { on: options.on } : {}),
            };
        }
        return {
            title: $localize`:@@i18n.common.delete:delete`,
            interrupt: { service: ModalConfirmComponent, args: { message, title: $localize`:@@i18n.common.attention:attention` } },
            action: options?.action ?? (() => self.delete()),
            type: NxActionType.Destructive,
            group: true,
            hotkey: 'CTRL+DELETE',
            ...(options?.roles !== undefined ? { roles: options.roles } : {}),
            ...(options?.on ? { on: options.on } : {}),
        };
    }

    static clipboardActions(_: Serializable, addContext?: string) {
        return [
            {
                title: $localize`:@@i18n.common.addToClipboard:add to clipboard`,
                group: true,
                ...(addContext ? { context: addContext } : {}),
                action: () => NxGlobal.clip(_),
            },
            {
                title: $localize`:@@i18n.common.removeFromClipboard:remove from clipboard`,
                group: true,
                on: (): boolean => NxGlobal.hasClip(_),
                action: () => NxGlobal.unclip(_),
            },
        ];
    }

    static getClips = () => this.#clips;
    static getClipKeys = () => Object.keys(this.#clips);
    static setCurrentRoot = (_?: Serializable) => (this.#currentRoot = _);
    static getCurrentRoot = () => this.#currentRoot;

    static #emitClipboard() {
        this.#clips = objectRemoveEmpty(this.#clips);
        this.#clipboardSubject.next(Object.values(this.#clips).flattened().length > 0);
    }

    static #updateClipboardCookies() {
        localStorage.setItem('CLIPBOARD', JSON.stringify(objectMap(this.#clips, (val) => val.map((_) => _.id))));
    }

    static loadClipboardCookies = async () => {
        const raw = localStorage.getItem('CLIPBOARD') || getCookie('CLIPBOARD');
        if (!raw) return;

        const cookie = JSON.parse(raw) as TClipDict<number>;
        if (!Object.values(cookie).flattened().length) return;

        const { REFLECTION } = await import('src/constants/constants');
        NxGlobal.service.post('populate-clipboard', cookie).subscribe((response) => {
            const data = response as TClipDict<{ class?: string }>;
            const d: TClipDict<Serializable> = {};
            for (const c of Object.keys(data)) {
                d[c] = data[c].map((_) => REFLECTION(_));
            }
            this.#clips = d;
            this.#emitClipboard();
        });
    };

    static getService<T>(token: ProviderToken<T>): T {
        try {
            return NxGlobal.injector.get(token) as T;
        } catch (_error) {
            console.trace("Error loading injection token. Usually this happens, because it does not have @Injectable({ providedIn: 'root' })", token);
            return undefined as T;
        }
    }

    static payload(obj: Serializable, hidden: string[] = []): Dictionary {
        return NxGlobal.payloadFor(obj, obj.constructor as typeof Serializable, hidden);
    }

    // Callers pass either a concrete model class or `x.constructor` (cast to `typeof Serializable`,
    // since a Serializable instance's constructor is always one of its subclasses).
    static payloadFor(obj: Serializable, ctor: typeof Serializable, hidden: string[] = []): Dictionary {
        const c = ctor.DB_TABLE_NAME();
        const additional = ctor.ADDITIONAL_COLUMNS();
        const o = obj as unknown as Dictionary;
        const tables = NxGlobal.global.tables?.filter((_) => _.name == c);
        if (tables) {
            const d: Dictionary = {};
            if (tables.length !== 1) {
                const _class = obj.class ?? 'unknown';
                const myClass = ctor.name;
                console.log(obj);
                console.trace(`table "${c}" "${_class}" "${myClass}" not known to NEXUS - maybe not defined in environment update`);
                return d;
            }
            const fields = tables[0].columns.map((_) => _.Field);
            for (const i in o) {
                if (hidden.includes(i)) continue;
                if (i === 'id') continue;
                if (!fields.includes(i) && !additional.includes(i)) continue;
                d[i] = o[i];
            }
            return d;
        }
        return obj as unknown as Dictionary;
    }

    static navigateTo = (url: string) => this.router.navigate([SmartLinkDirective.dynamicUrlFor(url)]);

    static setTitle = (title: string) => {
        this.currentTitle = title;
        this.title?.setTitle(title);
    };
}
