import { Injectable, Type } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';
import { Serializable } from '../serializable';
import { Deserializer, HttpInjectWrapper, T_METHOD } from './http.wrapper';
import { Dictionary } from '@constants/constants';

/** A model class accepted by the typed verbs; a static `fromJson` enables deserialization. */
export type ApiType<U> = Type<U> & { fromJson?: (json: any) => any };

/** Laravel paginator envelope as returned by paginated index endpoints. */
export interface Page<T> {
    data: T[];
    current_page: number;
    last_page: number;
    next_page_url: string | null;
    per_page?: number;
    total?: number;
}

/** Request body for put/post/patch: plain dictionaries, model instances, arrays or FormData. */
type Body = object;

/** Runtime argument layout shared by all verbs; see `#request` for resolution. */
type VERB_ARGS = [url: string, $2?: Dictionary | Body | Type<unknown> | null, $3?: Type<unknown>];

const idOf = (target: string | number | Serializable): string | number => (target instanceof Serializable ? target.id : target);

/**
 * Anonymous Nexus API client for code that is not tied to a single resource
 * (e.g. `Serializable`'s model-level CRUD or one-off endpoint calls).
 * Responses are returned as raw JSON.
 */
@Injectable({ providedIn: 'root' })
export class NexusHttp extends HttpInjectWrapper {
    override baseUrl = () => environment.envApi;
}

/**
 * Typed REST client for one backend resource.
 *
 * Subclasses set `apiPath` and usually `model`; responses are then deserialized
 * via the model's static `fromJson` — per item for arrays and paginated
 * `{ data: [...] }` envelopes. Each verb accepts an optional model class to
 * deserialize into a different type, or `Object` to skip deserialization:
 *
 *     this.get('users/1')                          // Observable<T> via `model`
 *     this.aget(url, filters, VacationGrant)       // Observable<VacationGrant[]>
 *     this.post('login', payload, Object)          // Observable<any>, raw JSON
 *
 * `payload`/`query` is the request body on put/post/patch and the query string
 * on get/delete. Standard CRUD (`index`/`show`/`update`/`destroy`) is derived
 * from `apiPath`; override only when a resource deviates.
 */
export abstract class NexusHttpService<T extends Serializable> extends HttpInjectWrapper {
    public abstract apiPath: string;

    /** Model used to deserialize responses when no explicit type argument is given. */
    readonly model?: Type<T>;

    override baseUrl = () => environment.envApi;

    index = (filters?: Dictionary): Observable<T[]> => this.aget(this.apiPath, filters);
    show(id: string | number, filters?: Dictionary): Observable<T> { return this.get(`${this.apiPath}/${id}`, filters); }
    update(target: string | number | T, data: Dictionary): Observable<T> { return this.put(`${this.apiPath}/${idOf(target)}`, data); }
    destroy(target: string | number | T): Observable<unknown> { return this.delete(`${this.apiPath}/${idOf(target)}`); }

    override get(url: string, query: Dictionary | null | undefined, type: ObjectConstructor): Observable<any>;
    override get<U>(url: string, query: Dictionary | null | undefined, type: ApiType<U>): Observable<U>;
    override get<U = T>(url: string, query?: Dictionary): Observable<U>;
    override get(...args: any[]): Observable<any> { return this.#request('get', args as VERB_ARGS); }

    override aget(url: string, query: Dictionary | null | undefined, type: ObjectConstructor): Observable<any[]>;
    override aget<U>(url: string, query: Dictionary | null | undefined, type: ApiType<U>): Observable<U[]>;
    override aget<U = T>(url: string, query?: Dictionary): Observable<U[]>;
    override aget(...args: any[]): Observable<any[]> { return this.#request('get', args as VERB_ARGS); }

    override delete(url: string, query: Dictionary | null | undefined, type: ObjectConstructor): Observable<any>;
    override delete<U>(url: string, query: Dictionary | null | undefined, type: ApiType<U>): Observable<U>;
    override delete<U = T>(url: string, query?: Dictionary): Observable<U>;
    override delete(...args: any[]): Observable<any> { return this.#request('delete', args as VERB_ARGS); }

    override put(url: string, payload: Body | null | undefined, type: ObjectConstructor): Observable<any>;
    override put<U>(url: string, payload: Body | null | undefined, type: ApiType<U>): Observable<U>;
    override put<U = T>(url: string, payload?: Body): Observable<U>;
    override put(...args: any[]): Observable<any> { return this.#request('put', args as VERB_ARGS); }

    override post(url: string, payload: Body | null | undefined, type: ObjectConstructor): Observable<any>;
    override post<U>(url: string, payload: Body | null | undefined, type: ApiType<U>): Observable<U>;
    override post<U = T>(url: string, payload?: Body): Observable<U>;
    override post(...args: any[]): Observable<any> { return this.#request('post', args as VERB_ARGS); }

    paginate<U>(url: string, query: Dictionary | null | undefined, type: ApiType<U>): Observable<Page<U>>;
    paginate<U = T>(url: string, query?: Dictionary): Observable<Page<U>>;
    paginate(...args: any[]): Observable<Page<any>> { return this.#request('get', args as VERB_ARGS); }

    /**
     * Resolves the call variants (url) | (url, params) | (url, params, type).
     * A model class in the second slot (legacy untyped calls) is tolerated and
     * treated as the type, never as a payload.
     */
    #request = (method: T_METHOD, [url, $2, $3]: VERB_ARGS): Observable<any> => {
        const type = typeof $2 === 'function' ? ($2 as Type<unknown>) : $3;
        const params = typeof $2 === 'function' ? {} : $2 ?? {};
        const bodyless = method === 'get' || method === 'delete';
        return this.request({
            method,
            url,
            query: bodyless ? params : undefined,
            body: bodyless ? undefined : params,
            deserialize: this.#deserializerFor(type),
        });
    };

    #deserializerFor = (type?: Type<unknown>): Deserializer | undefined => {
        const ctor = (type ?? this.model) as ApiType<unknown> | undefined;
        if (!ctor || typeof ctor.fromJson !== 'function') return undefined;
        return (json) => ctor.fromJson!(json);
    };
}
