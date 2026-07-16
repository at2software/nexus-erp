import { Toast } from './../app/_shards/toast/toast';
import { environment } from '../environments/environment';
import { dayjs, Dayjs } from '@constants/dates';
import { NxAction } from '@app/nx/nx.actions';
import { computed, ProviderToken, Signal, Type, signal, untracked, WritableSignal } from '@angular/core';
import { NxGlobal, TBroadcast } from '@app/nx/nx.global';
import { map, Observable } from 'rxjs';
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
import { Dictionary } from '@constants/constants';
import { LiveModelRegistry } from './live-model-registry';

const BACKEND_MODEL_NAMESPACE = 'App\\Models\\';

/**
 * Recursively calls afterDeserialize on nested Serializable instances (children first).
 * `seen` guards against circular relations (e.g. product.invoice_items[].product_source === product)
 * which would otherwise recurse until the call stack overflows.
 */
function initNestedSerializables(instance: Serializable, json: unknown, seen: WeakSet<Serializable> = new WeakSet()): void {
    if (seen.has(instance)) return;
    seen.add(instance);
    if (!json || typeof json !== 'object') return;
    const jsonRecord = json as Dictionary;
    const instanceRecord = instance as unknown as Dictionary;
    for (const key of Object.keys(instance)) {
        const val = instanceRecord[key];
        const rawVal = jsonRecord[key];
        if (val instanceof Serializable) {
            if (seen.has(val)) continue;
            const nestedJson = rawVal && typeof rawVal === 'object' ? rawVal as Dictionary : {};
            initNestedSerializables(val, nestedJson, seen);
            val.afterDeserialize(nestedJson);
        } else if (Array.isArray(val)) {
            const rawArr = Array.isArray(rawVal) ? rawVal : [];
            for (let i = 0; i < val.length; i++) {
                if (val[i] instanceof Serializable && !seen.has(val[i])) {
                    const itemJson = rawArr[i] && typeof rawArr[i] === 'object' ? rawArr[i] as Dictionary : {};
                    initNestedSerializables(val[i], itemJson, seen);
                    val[i].afterDeserialize(itemJson);
                }
            }
        }
    }
}

export abstract class Serializable implements INxContextMenu {

    static API_PATH(): string { throw new Error(`${this.name} must override static API_PATH()`); }
    static DB_TABLE_NAME(): string { return this.API_PATH() }
    static ADDITIONAL_COLUMNS(): string[] { return [] }
    
    frontendUrl = (): string | undefined => undefined;
    apiPath = (): string => (this.constructor as typeof Serializable).API_PATH();
    apiPathWithId = (): string => `${this.apiPath()}/${this.id}`;
    getName = ():string => (this as { name?: string }).name ?? '';
    acceptedChildren = (): (typeof Serializable)[] => [];
    css = computed(() => 'primary' as string);

    abstract SERVICE: ProviderToken<unknown>;

    track_id: number = NxContextMenu.getTrackId();
    class: string = '';
    created_at: string = '';
    deleted_at: string = '';
    flags: number = 0;
    id: string = '';
    params?: Dictionary;
    updated_at: string = '';
    var: Dictionary<any> = {};

    doubleClickAction: number = -1;
    actions: NxAction[] = [];

    @Exclude() httpService: HttpWrapper = NxGlobal.service as unknown as HttpWrapper;

    isDirty = computed((): boolean => { this.snapshot(); return JSON.stringify(this.toPayload()) !== this.#baseline; });
    createdAt = computed((): Dayjs => dayjs(this.snapshot().created_at as string));
    updatedAt = computed((): Dayjs => dayjs(this.snapshot().updated_at as string));
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


    static fromJson<T>(this: new () => T, json: unknown = {}): T {
        if ((this as unknown) === Serializable) {
            console.trace('Serializable.fromJson() called on the abstract base class directly - find the caller below and use a concrete model instead', json);
        }
        const d = (json ?? {}) as Dictionary;
        const instance = plainToInstance(this, d) as T & { afterDeserialize?: (data: Dictionary) => void };
        instance.afterDeserialize?.(d);
        return instance;
    }

    fromJson(json: unknown = {}): this {
        if ((this.constructor as unknown) === Serializable) {
            console.trace('Serializable#fromJson() called on a bare base-class instance - find the caller below and use a concrete model instead', json);
        }
        plainToClassFromExist(this, json);
        this.afterDeserialize(json);
        return this;
    }

    afterDeserialize(json: unknown): void {
        initNestedSerializables(this, json);
        untracked(() => {
            this.captureBaseline();
            this.#state.set(json);
        });
        LiveModelRegistry.register(this);
    }

    setBadge = (badge: [string,string]|undefined): void => (this.badge as WritableSignal<[string,string]|undefined>).set(badge);

    #bump = (): void => this.#state.update((d) => Object.assign({}, d));

    snapshotAsThis = (): Partial<this> => this.snapshot() as Partial<this>;

    patch(json: Partial<this> | Dictionary): void { Object.assign(this, json); this.#bump(); }

    store(changes?: Dictionary): Observable<this> {
        return this.httpService.post(this.apiPath(), changes ?? this.toPayload()).pipe(
            map((x) => {
                if (x && typeof x === 'object') this.fromJson(x as Dictionary);
                if (x !== undefined) Toast.success('Successfully created');
                return this;
            }),
        );
    }

    refresh(): Observable<this> {
        return this.httpService.get(this.apiPathWithId()).pipe(
            map((x) => {
                if (x && typeof x === 'object') this.fromJson(x as Dictionary);
                return this;
            }),
        );
    }

    update(changes?: Dictionary, silent = false): Observable<this> {
        return this.httpService.put(this.apiPathWithId(), changes ?? this.dirtyFields()).pipe(
            map((x) => {
                if (typeof x === 'object') this.fromJson(x as Dictionary);
                if (x && !silent) Toast.success('Successfully updated');
                return this;
            }),
        );
    }

    delete(): Observable<this> {
        return this.httpService.delete(this.apiPathWithId()).pipe(
            map((x) => {
                if (x) {
                    Toast.success('Successfully deleted');
                    NxGlobal.broadcast({ type: TBroadcast.Delete, data: this });
                }
                return this;
            }),
        );
    }

    // Params
    showParam = (key: string, data: Dictionary = {}): Observable<unknown> => this.httpService.get(this.getParamPath(key), data);
    updateParam = (key: string, changes: Dictionary): Observable<unknown> => this.httpService.put(this.getParamPath(key), changes);
    removeParam = (paramName: string) => this.httpService.delete(this.getParamPath(paramName));
    getParamPath = (key: string): string => `${this.apiPathWithId()}/params/${key}`;
    getParam = (key: string, def?: string): string | undefined => this.#getParam<string>(key, def);
    getFloatParam = (key: string, def?: number): number | undefined => this.#getParam<number>(key, def);
    #getParam = <T = string|number>(key: string, def: T | undefined = undefined): T | undefined => this.params && key in this.params ? (this.params[key] as T) : def;

    toPayload = (hidden: string[] = []): Dictionary => jsonSafe(NxGlobal.payloadFor(this, this.constructor as typeof Serializable, hidden)) ?? {};
    captureBaseline = (): void => void (this.#baseline = JSON.stringify(this.toPayload()));

    acceptsChild = (_: Serializable): boolean => this.acceptedChildren().some((x) => x === _.constructor);
    setParent = (_: Serializable) => console.error('setParent() not implemented for class ' + this.class);
    navigateTo = (url: string) => NxGlobal.navigateTo(url);
    nxSelect = <T extends Serializable>(predicate: (_: T) => boolean) => NxGlobal.nxService.selectWith(predicate);
    getService = <T>(_: Type<T>) => NxGlobal.getService(_) as T;
    isClass = (c: string): boolean => this.class === c;
    assert = <T>(c: Type<T>): T | undefined => (this instanceof c ? (this as unknown as T) : undefined);
    hasFlag = (bit: number): boolean => (this.flags & bit) !== 0;

    modalConfirm = (title: string = 'Attention', text: string = 'Do you really want to delete?') => this.getService(ConfirmationService).confirm({ title, message: text });
    modalInput = (title: string) => this.getService(InputModalService).open(title);

    dirtyFields(): Dictionary {
        const current = this.toPayload();
        const base = JSON.parse(this.#baseline) as Dictionary;
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
                (clone as Dictionary<unknown>)[key] = key === 'httpService' ? (this as Record<string, unknown>)[key] : deepCopy((this as Record<string, unknown>)[key]);
            }
            return clone;
        } catch (e) {
            console.error(e);
            return this as unknown as T;
        }
    };

}
