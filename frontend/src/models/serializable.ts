import { Toast } from './../app/_shards/toast/toast';
import { environment } from '../environments/environment';
import moment from 'moment';
import { Dictionary } from '../constants/constants';
import { NxAction } from 'src/app/nx/nx.actions';
import { ProviderToken, Type } from '@angular/core';
import { NxGlobal, TBroadcast } from 'src/app/nx/nx.global';
import { map, Observable, tap } from 'rxjs';
import { ConfirmationService } from '@app/_modals/modal-confirm/confirmation.service';
import { InputModalService } from '@app/_modals/modal-input/modal-input.component';
import { HttpWrapper } from './http/http.wrapper';
import { INxContextMenu } from '@app/nx/nx.contextmenu.interface';
import { NxContextMenu } from '@app/nx/nx.contextmenu';
import { Marker } from 'src/enums/marker';

const primitives = ['number', 'boolean', 'string']
export abstract class Serializable implements INxContextMenu {

    track_id: number = NxContextMenu.getTrackId();

    // to be overwritten
    static API_PATH = (): string => { console.error("undefined API_PATH", this); return ''; }
    static DB_TABLE_NAME(): string { return this.API_PATH() }
    static ADDITIONAL_COLUMNS = (): string[] => []

    abstract SERVICE: ProviderToken<any>
    
    actions           : NxAction[] = []
    badge             : undefined | [string, string] = undefined
    class             : string = ''
    colorCss          : string = 'primary'
    created_at        : string = ''
    deleted_at        : string
    doubleClickAction : number = -1
    flags             : number = 0
    httpService       : HttpWrapper = NxGlobal.service
    iconBaseUrl       : string = environment.envApi
    id                : string     = ''
    ngLink           ?: string
    params           ?: Dictionary
    snapshotData      : Dictionary
    updated_at        : string = ''
    var               : any = {}
    _receivedKeys     : string[] = []

    protected _icon: string = 'nexus/icon'

    get icon(): string { return this.iconBaseUrl + this._icon }
    set icon(value: any) { this._icon = value }

    static fromJson<T extends Serializable>(this: new () => T, json: any = {}): T {
        const instance = new this();
        (instance as any).__autoWrapInit?.();
        instance._serialize(json);
        return instance;
    }

    serialize?(_json?: any): void
    _serialize(json: any) {
        this.class = (this.constructor as any).name.replace('_', '')
        if (json) {
            this._receivedKeys = Object.keys(json)
            for (const key of this._receivedKeys) {
                if (typeof (this as any)[key] === 'function') continue
                (this as any)[key] = json[key]
            }
        }
        this.serialize?.(json)
        this.snapshot()
        return this
    }

    /**
     * Merges a new array of models into an existing array property by ID.
     * Only updates properties that were actually returned by the API (_receivedKeys),
     * preserving existing properties not included in the new response.
     * Items in the existing array that aren't in the new response are kept.
     */
    mergeArrayInto<T extends Serializable>(key: string, newItems: T[]) {
        const existing: T[] = (this as any)[key] ?? []
        const byId = new Map<string, T>(existing.filter(x => x.id).map(x => [x.id, x]))

        const merged: T[] = newItems.map(newItem => {
            const existingItem = newItem.id ? byId.get(newItem.id) : undefined
            if (!existingItem) return newItem

            for (const k of newItem._receivedKeys) {
                ;(existingItem as any)[k] = (newItem as any)[k]
            }
            existingItem.snapshot()
            return existingItem
        })

        const mergedIds = new Set(merged.filter(x => x.id).map(x => x.id))
        existing.forEach(item => {
            if (item.id && !mergedIds.has(item.id)) merged.push(item)
        })

        ;(this as any)[key] = merged
    }

    time_created = (): moment.Moment => moment(this.created_at)
    time_updated = (): moment.Moment => moment(this.updated_at)

    getApiPath = () => (this.constructor as any).API_PATH()
    getApiPathWithId = () => `${this.getApiPath()}/${this.id}`
    getParamPath = (key: string) => `${this.getApiPathWithId()}/params/${key}`
    getName = () => (this as any).name
    getModelName = () => 'App\\Models\\' + this.class
    getAcceptedChildren = (): typeof Serializable[] => []
    acceptsChild = (_: Serializable) => this.getAcceptedChildren().find(x => x === _.constructor) ? true : false
    setParent = (_: Serializable) => console.error('setParent() not implemented for class ' + this.class)
    getParam = (key: string, def: string | undefined = undefined): string | undefined => this.#getParam<string>(key, def)
    getFloatParam = (key: string, def: number | undefined = undefined): number | undefined => this.#getParam<number>(key, def)
    
    snapshotNonPrimitives = (): string[] => []
    getClone<T extends Serializable>(): T {
        try {
            const clone = Object.create(Object.getPrototypeOf(this)) as T
            Object.assign(clone, this)
            return clone
        } catch (error) {
            console.error(error)
            return this as unknown as T
        }
    }

    hidden = (): string[] => ['created_at', 'updated_at', 'deleted_at', 'id']

    navigate = (url: string) => NxGlobal.navigateTo(url)
    
    /**
     * Returns the frontend URL for this object, or undefined if not applicable.
     * Override this in child classes to provide a navigable URL.
     * Used for double-click actions and CTRL+SHIFT+Click to open in new tab.
     */
    frontendUrl = (): string | undefined => undefined

    show(): Observable<any> {
        return this.httpService.get(this.getApiPathWithId()).pipe(map((x: any) => {
            this._serialize(x)
            return x
        }))
    }
    store(changes?: any): Observable<any> {
        if (!changes) {
            changes = NxGlobal.payloadFor(this, this.constructor)
        }
        return this.httpService.post(this.getApiPath(), changes).pipe(map((x: any) => {
            if (x === undefined) return
            this._serialize(x)
            this.snapshot()
            Toast.success('Successfully created')
            return x
        }))
    }
    refresh(assign: boolean = true): Observable<any> {
        return this.httpService.get(this.getApiPathWithId()).pipe(map((x: any) => {
            if (assign) this._serialize(x);
            return x
        }))
    }
    update(changes?: any): Observable<any> {
        if (!changes) {
            changes = this.snapshotDiff()
        }
        return this.httpService.put(this.getApiPathWithId(), changes).pipe(tap((x: any) => {
            if (x) {
                this._serialize(x)
                Toast.success('Successfully updated')
            }
        }))
    }
    delete(): Observable<any> {
        return this.httpService.delete(this.getApiPathWithId()).pipe(tap((x: any) => {
            if (x) {
                Toast.success('Successfully deleted')
                NxGlobal.broadcast({type: TBroadcast.Delete, data: this})
            }
        }))
    }
    showParam = (key: string, data: any = {}): Observable<any> => this.httpService.get(this.getParamPath(key), data)
    updateParam = (key: string, changes: any): Observable<any> => this.httpService.put(this.getParamPath(key), changes)
    removeParam = (paramName: string) => this.httpService.delete(this.getParamPath(paramName))

    confirm = (title: string = 'Attention', text: string = 'Do you really want to delete?') => this.getService(ConfirmationService).confirm({ title: title, message: text })
    input = (title: string) => this.getService(InputModalService).open(title)

    nxSelect = <T extends Serializable>(predicate: (_: T) => boolean) => NxGlobal.nxService.selectWith(predicate)
    getService = <T>(_: Type<T>) => (NxGlobal.getService(_) as T)
    is = (c: string) => this.class === c
    assert = <T>(c: Type<T>) => this instanceof c ? this : undefined
    snapshot(): void { this.snapshotData = this.getPrimitives() }
    hasFlag = (bit: number) => (this.flags & bit) ? true : false

    getPrimitives(except: string[] = []): Dictionary {
        const d: Dictionary = {}
        const m = NxGlobal.payloadFor(this, this.constructor)
        for (const key of Object.keys(m)) {
            if (except.includes(key)) continue
            const type = typeof (m)[key]
            if (primitives.includes(type) || (m)[key] === null) {
                d[key] = (m)[key]
            }
            else if (this.snapshotNonPrimitives().includes(key)) {
                d[key] = JSON.stringify((m)[key])
            }
        }
        return d
    }

    protected _snapshotDiff() {
        const d: Dictionary = {}
        if (this.snapshotData) {
            for (const key of Object.keys(this.snapshotData)) {
                if (this.snapshotData[key] !== (this as any)[key]) {
                    d[key] = (this as any)[key]
                }
            }
        }
        this.snapshot()
        return d
    }
    protected snapshotDiff() { return this._snapshotDiff() }
    
    #getParam <T = string | number>(key: string, def: T | undefined = undefined): T | undefined {
        return this.params && key in this.params ? this.params[key] : def
    }

    // *********** marker specific stuff ***********
    markerClass = (): string => {
        if (!('marker' in this)) return ''
        return this.marker !== null && Marker[this.marker as number] ? `marker marker-${Marker[this.marker as number]}` : ''
    }
    markerActions = () => !('marker' in this) ? [] : [{
        title: $localize`:@@i18n.common.marker:marker`,
        group: true,
        children: [
            { title: $localize`:@@i18n.common.none:none`, group: true, action: () => this.update({ marker: null }) },
            ...Marker.map((color: string, index: number) => ({ title: color, group: true, action: () => this.update({ marker: index }) }))
        ]
    }]
}
