import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, map, tap, throwError } from 'rxjs';
import { NotificationCenter } from '../notification.service';
import { Dictionary } from '@constants/constants';
import { notifyHttpError, saveBlobResponse } from './file-download';

export type T_METHOD = 'get' | 'delete' | 'put' | 'post' | 'patch';

/** Converts one raw JSON item into its typed representation. */
export type Deserializer<T = unknown> = (json: unknown) => T;

/**
 * A fully resolved request. `query` is appended to the URL, `body` is sent as
 * the request body, and `deserialize` (if given) is applied to each item of the
 * response: to every element of an array response, to every element of a
 * paginated `{ data: [...] }` envelope, or to a single object response.
 */
export interface RequestSpec {
    method: T_METHOD;
    url: string;
    query?: unknown;
    body?: unknown;
    deserialize?: Deserializer;
}

const MUTATING: ReadonlySet<T_METHOD> = new Set<T_METHOD>(['put', 'post', 'patch', 'delete']);
const LAST_MODIFIED_LIMIT = 200;

/**
 * Bounded LRU map for last-modified headers, scoped to the current page lifetime.
 * Replaces the previously unbounded sessionStorage usage.
 */
class LruMap<K, V> extends Map<K, V> {
    constructor(private readonly limit: number) {
        super();
    }
    override get(key: K): V | undefined {
        const v = super.get(key);
        if (v !== undefined) {
            super.delete(key);
            super.set(key, v);
        }
        return v;
    }
    override set(key: K, value: V): this {
        if (super.has(key)) super.delete(key);
        super.set(key, value);
        if (this.size > this.limit) {
            const oldest = this.keys().next().value as K | undefined;
            if (oldest !== undefined) super.delete(oldest);
        }
        return this;
    }
}

/**
 * HTTP transport layer: URL/query building, conditional requests via
 * If-Modified-Since, mutation notifications, error toasts and response
 * deserialization. Typed resource access lives in `NexusHttpService`;
 * file downloads in `file-download.ts`.
 *
 * For all verbs, `params` is the query string on get/delete and the request
 * body on put/post/patch. A per-item mapping arrow function may be passed as
 * third argument (used by the plugin clients, e.g. `this.get(url, {}, this.toTask)`).
 */
export abstract class HttpWrapper {
    _baseUrl: string = '';
    _http!: HttpClient;

    /** Per-process cache; bounded to avoid memory leaks. */
    static readonly #lastModified = new LruMap<string, string>(LAST_MODIFIED_LIMIT);

    baseUrl = (): string => this._baseUrl;
    http = (): HttpClient => this._http;

    get<T=unknown>(url: string, params?: Dictionary, ...args: Deserializer[]): Observable<T> { return this.request({ method: 'get', url, query: params, deserialize: mapperOf(args) }); }
    aget<T = unknown>(url: string, params?: Dictionary, ...args: Deserializer[]): Observable<T[]> { return this.request({ method: 'get', url, query: params, deserialize: mapperOf(args) }); }
    delete<T=unknown>(url: string, params?: Dictionary, ...args: Deserializer[]): Observable<T> { return this.request({ method: 'delete', url, query: params, deserialize: mapperOf(args) }); }
    put<T=unknown>(url: string, params?: Dictionary, ...args: Deserializer[]): Observable<T> { return this.request({ method: 'put', url, body: params, deserialize: mapperOf(args) }); }
    post<T=unknown>(url: string, params?: Dictionary, ...args: Deserializer[]): Observable<T> { return this.request({ method: 'post', url, body: params, deserialize: mapperOf(args) }); }
    patch<T=unknown>(url: string, params?: Dictionary, ...args: Deserializer[]): Observable<T> { return this.request({ method: 'patch', url, body: params, deserialize: mapperOf(args) }); }
    upload<T=unknown>(url: string, data: FormData): Observable<T> { return this.request({ method: 'post', url, body: data }); }

    /** Follows an absolute pagination URL (e.g. Laravel's `next_page_url`). */
    next = <T>(url: string): Observable<T> => this.request<T>({ method: 'get', url });

    protected request = <T = unknown>(spec: RequestSpec): Observable<T> => {
        const finalUrl = this.#getApiUrl(spec.url, spec.query);

        const lastModified = HttpWrapper.#lastModified.get(finalUrl);
        const headers = lastModified ? new HttpHeaders({ 'If-Modified-Since': lastModified }) : new HttpHeaders();

        const options: { observe: 'response'; headers: HttpHeaders; body?: unknown } = { observe: 'response', headers };
        if (spec.body !== undefined) options.body = spec.body;

        return this.http()
            .request(spec.method, finalUrl, options)
            .pipe(
                tap((response) => this.#rememberLastModified(response, finalUrl)),
                tap(() => this.#notifyMutation(spec.method, spec.url)),
                map((response) => deserializeBody(response.body, spec.deserialize) as T),
                catchError((err) => {
                    notifyHttpError(err);
                    return throwError(() => err);
                }),
            );
    };

    #getApiUrl = (url: string, params?: unknown): string => {
        let myUrl: string = /^https?:/i.test(url) ? url : this.baseUrl() + url;
        const processed = this.#toQueryParams(params);
        if (Object.keys(processed).length) {
            myUrl += '?' + new URLSearchParams(processed).toString();
        }
        return myUrl;
    };

    #toQueryParams = (params: unknown): Dictionary<string> => {
        if (!params || typeof params !== 'object' || params instanceof FormData) return {};
        const processed: Dictionary<string> = {};
        for (const [key, value] of Object.entries(params as Dictionary)) {
            if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                console.warn('[HTTP] query param', key, 'is an object and serializes as "[object Object]"', value);
            }
            processed[key] = Array.isArray(value) ? value.join(',') : String(value);
        }
        return processed;
    };

    #rememberLastModified(response: HttpResponse<unknown>, url: string): void {
        const lastModified = response?.headers?.get('Last-Modified');
        if (lastModified) HttpWrapper.#lastModified.set(url, lastModified);
    }

    #notifyMutation(method: T_METHOD, url: string): void {
        if (MUTATING.has(method)) NotificationCenter.subj.next({ key: method, value: url });
    }

    getBlob = (url: string, params?: Dictionary) => this.http().get(this.#getApiUrl(url, params), { responseType: 'blob' });
    postBlob(url: string, data?: unknown, success?: () => void) {
        return this.http()
            .post(this.#getApiUrl(url), data, { responseType: 'blob', observe: 'response' })
            .subscribe((r) => saveBlobResponse(r, success));
    }
    getFile(url: string, params?: Dictionary, success?: () => unknown): void {
        this.http().get(this.#getApiUrl(url, params), { responseType: 'blob', observe: 'response' }).subscribe({
            next: (r) => saveBlobResponse(r, success),
            error: notifyHttpError,
        });
    }
    postFile(url: string, params?: Dictionary, success?: () => unknown): void {
        this.http().post(this.#getApiUrl(url), params, { responseType: 'blob', observe: 'response' }).subscribe({
            next: (r) => saveBlobResponse(r, success),
            error: notifyHttpError,
        });
    }
}

/** Plugin clients pass per-item mapping arrow functions as third verb argument. */
const mapperOf = (args: Deserializer[]): Deserializer | undefined =>
    args.length && typeof args[0] === 'function' && !args[0].prototype ? (item: unknown) => args[0](item) : undefined;

const deserializeBody = (result: unknown, deserialize?: Deserializer): unknown => {
    if (!result || !deserialize) return result;
    if (Array.isArray(result)) return result.map(deserialize);
    if (typeof result === 'object') {
        const record = result as Dictionary<unknown>;
        if (Array.isArray(record['data'])) {
            record['data'] = record['data'].map(deserialize);
            return record;
        }
        return deserialize(result);
    }
    return result;
};

export abstract class HttpInjectWrapper extends HttpWrapper {
    #http = inject(HttpClient);
    override http = (): HttpClient => this.#http;
}
