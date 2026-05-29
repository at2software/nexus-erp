import { Toast } from './../app/_shards/toast/toast';
import { environment } from '../environments/environment';
import moment from 'moment';
import { Dictionary } from '@constants/constants';
import { NxAction } from '@app/nx/nx.actions';
import { computed, ProviderToken, Signal, Type, signal, WritableSignal } from '@angular/core';
import { NxGlobal, TBroadcast } from '@app/nx/nx.global';
import { map, Observable, tap } from 'rxjs';
import { ConfirmationService } from '@app/_modals/modal-confirm/confirmation.service';
import { InputModalService } from '@app/_modals/modal-input/modal-input.component';
import { HttpWrapper } from './http/http.wrapper';
import { INxContextMenu } from '@app/nx/nx.contextmenu.interface';
import { NxContextMenu } from '@app/nx/nx.contextmenu';
import { deepCopy } from '@constants/deepClone';
import { deepEqual } from '@constants/deepEqual';
import { jsonSafe } from '@constants/jsonSafe';
import { Exclude, plainToClassFromExist, plainToInstance } from 'class-transformer';
import { Marker } from '@enums/marker';

const BACKEND_MODEL_NAMESPACE = 'App\\Models\\';

/** Recursively calls afterDeserialize on nested Serializable instances (children first). */
function initNestedSerializables(instance: Serializable, json: any): void {
    if (!json || typeof json !== 'object') return;
    for (const key of Object.keys(instance)) {
        const val = (instance as any)[key];
        const rawVal = json[key];
        if (val instanceof Serializable) {
            initNestedSerializables(val, rawVal ?? {});
            val.afterDeserialize(rawVal ?? {});
        } else if (Array.isArray(val)) {
            const rawArr = Array.isArray(rawVal) ? rawVal : [];
            for (let i = 0; i < val.length; i++) {
                if (val[i] instanceof Serializable) {
                    const itemJson = rawArr[i] ?? {};
                    initNestedSerializables(val[i], itemJson);
                    val[i].afterDeserialize(itemJson);
                }
            }
        }
    }
}

export abstract class Serializable implements INxContextMenu {

    static API_PATH = (): string => { console.error('undefined API_PATH', this); return ''; };
    static DB_TABLE_NAME(): string { return this.API_PATH() }
    static ADDITIONAL_COLUMNS(): string[] { return [] }
    
    frontendUrl = (): string | undefined => undefined;
    apiPath = (): string => (this.constructor as any).API_PATH();
    apiPathWithId = (): string => `${this.apiPath()}/${this.id}`;
    getName = () => (this as any).name;
    acceptedChildren = (): (typeof Serializable)[] => [];
    css = computed(() => 'primary' as string);

    abstract SERVICE: ProviderToken<any>;

    track_id: number = NxContextMenu.getTrackId();
    class: string = '';
    created_at: string = '';
    deleted_at: string = '';
    flags: number = 0;
    id: string = '';
    params?: Dictionary;
    updated_at: string = '';
    var: any = {};

    doubleClickAction: number = -1;
    actions: NxAction[] = [];

    @Exclude() httpService: HttpWrapper = NxGlobal.service;

    isDirty = computed((): boolean => { this.snapshot(); return JSON.stringify(this.toPayload()) !== this.#baseline; });
    momentCreated = computed((): moment.Moment => moment(this.snapshot().created_at));
    momentUpdated = computed((): moment.Moment => moment(this.snapshot().updated_at));
    getModelName = computed((): string => BACKEND_MODEL_NAMESPACE + this.snapshot().class);
    
    markerClass = Marker.CLASS(this);
    markerActions = Marker.ACTIONS(this);

    /** Raw JSON signal from the last fromJson() call — read in computed() to create reactive dependencies. */
    #state = signal<any>({}, { equal: () => false });
    readonly snapshot = this.#state.asReadonly();

    readonly badge: Signal<[string,string]|undefined> = signal<[string,string]|undefined>(undefined);
    readonly ngLink: Signal<string|undefined> = signal<string|undefined>(undefined);
    
    #rawIcon = signal(environment.envApi + 'nexus/icon');
    protected readonly computedIcon = computed(() => this.#rawIcon());
    get icon(): string { return this.computedIcon(); }
    set icon(_v: string) { this.#rawIcon.set(environment.envApi + _v); }
    set _icon(_v: string) { this.#rawIcon.set(_v); }

    #baseline: string = '{}';


    static fromJson<T extends Serializable>(this: new () => T, json: any = {}): T {
        const instance = plainToInstance(this, json);
        instance.afterDeserialize(json);
        return instance;
    }

    fromJson(json: any): this {
        plainToClassFromExist(this, json);
        this.afterDeserialize(json);
        return this;
    }

    afterDeserialize(json: any): void {
        initNestedSerializables(this, json);
        this.captureBaseline();
        this.#state.set(json);
    }

    setBadge = (badge: [string,string]|undefined): void => (this.badge as WritableSignal<[string,string]|undefined>).set(badge);

    #bump = (): void => this.#state.update((d: any) => Object.assign({}, d));

    patch(json: any): void { Object.assign(this, json); this.#bump(); }

    store(changes?: any): Observable<any> {
        return this.httpService.post(this.apiPath(), changes ?? this.toPayload()).pipe(
            map((x: any) => {
                if (x === undefined) return;
                this.fromJson(x);
                Toast.success('Successfully created');
                return x;
            }),
        );
    }

    refresh(): Observable<any> {
        return this.httpService.get(this.apiPathWithId()).pipe(
            map((x: any) => { this.fromJson(x); return x }),
        );
    }

    update(changes?: any): Observable<any> {
        return this.httpService.put(this.apiPathWithId(), changes ?? this.dirtyFields()).pipe(
            tap((x: any) => {
                if (!x) return;
                this.fromJson(x);
                Toast.success('Successfully updated');
            }),
        );
    }

    delete(): Observable<any> {
        return this.httpService.delete(this.apiPathWithId()).pipe(
            tap((x: any) => {
                if (!x) return;
                Toast.success('Successfully deleted');
                NxGlobal.broadcast({ type: TBroadcast.Delete, data: this });
            }),
        );
    }

    // Params
    showParam = (key: string, data: any = {}): Observable<any> => this.httpService.get(this.getParamPath(key), data);
    updateParam = (key: string, changes: any): Observable<any> => this.httpService.put(this.getParamPath(key), changes);
    removeParam = (paramName: string) => this.httpService.delete(this.getParamPath(paramName));
    getParamPath = (key: string): string => `${this.apiPathWithId()}/params/${key}`;
    getParam = (key: string, def?: string): string | undefined => this.#getParam<string>(key, def);
    getFloatParam = (key: string, def?: number): number | undefined => this.#getParam<number>(key, def);
    #getParam = <T = string|number>(key: string, def: T | undefined = undefined): T | undefined => this.params && key in this.params ? (this.params[key] as T) : def;

    toPayload = (hidden: string[] = []): Dictionary => jsonSafe(NxGlobal.payloadFor(this, this.constructor, hidden)) ?? {};
    captureBaseline = (): void => void (this.#baseline = JSON.stringify(this.toPayload()));

    acceptsChild = (_: Serializable): boolean => this.acceptedChildren().some((x) => x === _.constructor);
    setParent = (_: Serializable) => console.error('setParent() not implemented for class ' + this.class);
    navigateTo = (url: string) => NxGlobal.navigateTo(url);
    nxSelect = <T extends Serializable>(predicate: (_: T) => boolean) => NxGlobal.nxService.selectWith(predicate);
    getService = <T>(_: Type<T>) => NxGlobal.getService(_) as T;
    isClass = (c: string): boolean => this.class === c;
    ofClassOrUndefined = <T>(c: Type<T>): T | undefined => (this instanceof c ? (this as unknown as T) : undefined);
    hasFlag = (bit: number): boolean => (this.flags & bit) !== 0;

    modalConfirm = (title: string = 'Attention', text: string = 'Do you really want to delete?') => this.getService(ConfirmationService).confirm({ title, message: text });
    modalInput = (title: string) => this.getService(InputModalService).open(title);

    dirtyFields(): Dictionary {
        const current = this.toPayload();
        const base: Dictionary = JSON.parse(this.#baseline);
        const diff: Dictionary = {};
        for (const key of Object.keys(current)) {
            if (!deepEqual(base[key], current[key])) diff[key] = current[key];
        }
        this.captureBaseline();
        return diff;
    }

    /** Returns a true deep clone — no shared array/object references. */
    getClone = <T extends Serializable>(): T => {
        try {
            const clone = Object.create(Object.getPrototypeOf(this)) as T;
            for (const key of Object.keys(this)) {
                (clone as any)[key] = key === 'httpService' ? (this as any)[key] : deepCopy((this as any)[key]);
            }
            return clone;
        } catch (e) {
            console.error(e);
            return this as unknown as T;
        }
    };

}
