import { Injectable, Type } from '@angular/core';
import { Dictionary } from '@constants/constants';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';
import { Serializable } from '../serializable';
import { HttpInjectWrapper } from './http.wrapper';

type API_ARGS<U> = [url: string, payload?: any, type?: Type<U>];

/**
 * Unified base HTTP service for typed Serializable endpoints.
 * Replaces the legacy `BaseHttpService` — see `HttpWrapper` for transport details
 * and `NexusHttpInterceptor` for auth/401 handling.
 */
@Injectable({ providedIn: 'root' })
export abstract class NexusHttpService<T extends Serializable> extends HttpInjectWrapper {
    public abstract apiPath: string;

    TYPE = (): Type<any> => Object;
    override baseUrl = () => environment.envApi;

    index = (filters?: Dictionary): Observable<T[]> => this.aget(this.apiPath, filters);

    override get<U = T>(...args: API_ARGS<U>): Observable<U> { return this.#perform('get', ...args); }
    override aget<U = T>(...args: API_ARGS<U>): Observable<U[]> { return this.#perform('get', ...args); }
    override delete<U = T>(...args: API_ARGS<U>): Observable<U> { return this.#perform('delete', ...args); }
    override put<U = T>(...args: API_ARGS<U>): Observable<U> { return this.#perform('put', ...args); }
    override post<U = T>(...args: API_ARGS<U>): Observable<U> { return this.#perform('post', ...args); }
    override paginate<U = T>(...args: API_ARGS<U>): Observable<U> { return this.#perform('get', ...args); }

    show(..._args: any): void { /* hook for subclasses */ }

    /**
     * Resolves overload variants (url) | (url, payload) | (url, type) | (url, payload, type)
     * into a typed { url, params, type } triple.
     */
    #defined = <U>(...[url, $2, type]: API_ARGS<U>): { url: string; params: any; type: Type<U> } => {
        if (typeof $2 === 'function') return { url, params: {}, type: $2 };
        if (type) return { url, params: $2 ?? {}, type };
        if (!$2) return { url, params: {}, type: this.TYPE() };
        return { url, params: $2, type: this.TYPE() };
    };

    #perform = <U, V = U>(fn: 'get' | 'delete' | 'put' | 'post' | 'patch', ...args: API_ARGS<U>): Observable<V> => {
        const { url, params, type } = this.#defined(...args);
        return this.performRequest(fn, url, params, type) as Observable<V>;
    };

    /** Overrides the wrapper's identity mapper with Serializable-aware deserialization. */
    override _map = <U>(result: any, ctor: Type<U>): U => {
        if (!ctor) return result;
        if ('fromJson' in ctor && typeof (ctor as any).fromJson === 'function') {
            return (ctor as any).fromJson(result) as U;
        }
        return result;
    };
}
