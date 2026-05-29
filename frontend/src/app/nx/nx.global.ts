import { Injector, ProviderToken } from '@angular/core';
import { Router } from '@angular/router';
import { Dictionary } from '@constants/constants';
import { Serializable } from '@models/serializable';
import { GlobalService } from '@models/global.service';
import { NexusHttpService } from '@models/http/http.nexus';
import { NxService } from './nx.service';
import { HttpClient } from '@angular/common/http';
import { Title } from '@angular/platform-browser';
import { SmartLinkDirective } from '@directives/smart-link.directive';
import { Subject } from 'rxjs';
import { getCookie, setCookie } from '@constants/cookies';
import { objectMap, objectRemoveEmpty } from '@constants/objectMap';
import { NxActionType } from './nx.actions';
import { ModalConfirmComponent } from '@app/_modals/modal-confirm/modal-confirm.component';
import { ModalBaseService } from '@app/_modals/modal-base-service';

type TClipDict<T> = Record<string, T[]>;

export enum TBroadcast {
    Update,
    Delete,
}
interface BroadcastPayload {
    type: TBroadcast;
    data: any;
}

/** Main helper class — exposes services and state statically to classes outside the injector */
export class NxGlobal {
    static service: NexusHttpService<any>;
    static http: HttpClient;
    static router: Router;
    static injector: Injector;
    static global: GlobalService;
    static nxService: NxService;
    static ME_ID: string;
    static title: Title;
    static currentTitle?: string;
    static context?: Serializable;
    static modalService: ModalBaseService<any>;
    static MODEL_REGISTRY_TOKEN: Record<string, any>;

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

    static deleteAction(self: any, message: string, options?: { roles?: string | null; on?: () => boolean; action?: () => void }) {
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
        setCookie('CLIPBOARD', JSON.stringify(objectMap(this.#clips, (val) => val.map((_) => _.id))), 7);
    }

    static loadClipboardCookies = async () => {
        const cookie = getCookie('CLIPBOARD');
        if (!cookie) return;

        const ccookie = cookie as unknown as TClipDict<number>;
        if (!Object.values(ccookie).flattened().length) return;

        const { REFLECTION } = await import('src/constants/constants');
        NxGlobal.service.post('populate-clipboard', cookie).subscribe((data: TClipDict<any>) => {
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
        return NxGlobal.payloadFor(obj, obj.constructor as any, hidden);
    }

    static payloadFor(obj: any, ctor: any, hidden: string[] = []): Dictionary {
        const c = ctor.DB_TABLE_NAME();
        const additional = ctor.ADDITIONAL_COLUMNS();
        const o = obj as any;
        const tables = NxGlobal.global.tables?.filter((_) => _.name == c);
        if (tables) {
            const d: Dictionary = {};
            if (tables.length !== 1) {
                console.trace(`table "${c}" not known to NEXUS - maybe not defined in environment update`);
                return d;
            }
            const fields = tables[0].columns.map((_: any) => _.Field);
            for (const i in o) {
                if (hidden.includes(i)) continue;
                if (i === 'id') continue;
                if (!fields.includes(i) && !additional.includes(i)) continue;
                d[i] = o[i];
            }
            return d;
        }
        return obj;
    }

    static navigateTo = (url: string) => this.router.navigate([SmartLinkDirective.dynamicUrlFor(url)]);

    static setTitle = (title: string) => {
        this.currentTitle = title;
        this.title?.setTitle(title);
    };
}
