import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, OperatorFunction, catchError, map, tap, throwError } from 'rxjs';
import { Toast } from '@shards/toast/toast';
import { Dictionary } from '@constants/constants';
import { NotificationCenter } from '../notification.service';

export type CUSTOM_PIPE = (op1: OperatorFunction<any, unknown>) => Observable<unknown>;
export type T_METHOD = 'get' | 'delete' | 'put' | 'post' | 'patch';

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

export abstract class HttpWrapper {
    _baseUrl: string = '';
    _http!: HttpClient;

    /** Per-process cache; bounded to avoid memory leaks. */
    static readonly #lastModified = new LruMap<string, string>(LAST_MODIFIED_LIMIT);

    baseUrl = (): string => this._baseUrl;
    http = (): HttpClient => this._http;

    #getApiUrl = (url: string, params: any = {}): string => {
        let myUrl: string = /^https?:/i.test(url) ? url : this.baseUrl() + url;
        if (params && Object.keys(params).length) {
            const processed: Record<string, string> = {};
            for (const [key, value] of Object.entries(params)) {
                processed[key] = Array.isArray(value) ? value.join(',') : String(value);
            }
            myUrl += '?' + new URLSearchParams(processed).toString();
        }
        return myUrl;
    };

    _map = (_: any, ..._args: any) => _;
    _getBlob = (url: string, params?: any) => this.http().get(this.#getApiUrl(url, params), { responseType: 'blob' });
    _postBlob = (url: string, data?: any) => this.http().post(this.#getApiUrl(url), data, { responseType: 'blob', observe: 'response' });

    get(url: string, params?: any, ...args: any) { return this.performRequest('get', url, params, ...args); }
    aget(url: string, params?: any, ...args: any) { return this.performRequest('get', url, params, ...args); }
    delete(url: string, params?: any, ...args: any) { return this.performRequest('delete', url, params, ...args); }
    put(url: string, params?: any, ...args: any) { return this.performRequest('put', url, params, ...args); }
    post(url: string, params?: any, ...args: any) { return this.performRequest('post', url, params, ...args); }
    patch(url: string, params?: any, ...args: any) { return this.performRequest('patch', url, params, ...args); }
    paginate(url: string, params?: any, ...args: any) { return this.performRequest('get', url, params, ...args); }

    getBlob(url: string, params?: any) { return this._getBlob(url, params); }
    postBlob(url: string, data?: any, success?: () => void) { return this._postBlob(url, data).subscribe((_) => this.parseBlob(_, success)); }
    next = <T>(url: string): Observable<T> => this.performRequest('get', url) as Observable<T>;

    performRequest = (method: T_METHOD, url: string, params?: any, ...args: any): Observable<any> => {
        const isBodyless = method === 'get' || method === 'delete';
        const finalUrl = isBodyless ? this.#getApiUrl(url, params) : this.#getApiUrl(url);

        const lastModified = HttpWrapper.#lastModified.get(finalUrl);
        const headers = lastModified ? new HttpHeaders({ 'If-Modified-Since': lastModified }) : new HttpHeaders();

        const options: any = { observe: 'response', headers };
        if (!isBodyless) options.body = params;

        return this.http()
            .request(method, finalUrl, options)
            .pipe(
                tap((response: any) => this.#handleLastModified(response, finalUrl)),
                tap(() => this.#emitNotification(method, url)),
                map((response: any) => this.#pipe(response.body, ...args)),
                catchError((err) => this.#catchError(err)),
            );
    };

    #handleLastModified(response: HttpResponse<unknown>, url: string): void {
        const lastModified = response?.headers?.get('Last-Modified');
        if (lastModified) HttpWrapper.#lastModified.set(url, lastModified);
    }

    #emitNotification(method: T_METHOD, url: string): void {
        if (MUTATING.has(method)) NotificationCenter.subj.next({ key: method, value: url });
    }

    #pipe = (result: any, ...args: any): any => {
        if (!result) return result;
        let fnMap = this._map;
        if (args.length && args[0] && !args[0].prototype) fnMap = args[0];
        if (Array.isArray(result)) return result.map((_) => fnMap(_, ...args));
        if (typeof result === 'object') {
            if ('data' in result && Array.isArray(result.data)) {
                result.data = result.data.map((_: any) => fnMap(_, ...args));
                return result;
            }
            return fnMap(result, ...args);
        }
        return result;
    };

    /** Toast on display-worthy errors, then rethrow so callers can react. */
    #catchError(err: any): Observable<never> {
        if (err && typeof err === 'object' && err.status >= 400) {
            console.warn('[HTTP]', err.status, err.url ?? '', err.error ?? err.statusText);
            const message = err.error?.message ?? err.error?.error_description ?? err.statusText;
            if (message) Toast.error(message);
        }
        return throwError(() => err);
    }

    parseBlob(res: HttpResponse<Blob>, success?: () => void): void {
        const contentType = res.headers.get('Content-Type')?.split(';')[0] ?? 'application/pdf';
        const fileName = res.headers.get('Content-Disposition')?.match(/['"](.*?)['"]/);
        const blob = new Blob([res.body!], { type: contentType });
        const a = document.createElement('a');
        const objectUrl = window.URL.createObjectURL(blob);
        document.body.appendChild(a);
        a.href = objectUrl;
        a.download = fileName ? fileName[1] : 'download.pdf';
        a.click();
        setTimeout(() => {
            window.URL.revokeObjectURL(objectUrl);
            document.body.removeChild(a);
            success?.();
        });
    }

    getFile(url: string, params?: Dictionary, success?: () => unknown): void {
        const downloadUrl = this.#getApiUrl(url, params);
        this.http().get(downloadUrl, { responseType: 'blob', observe: 'response' }).subscribe((r) => this.parseBlob(r, success));
    }
    postFile(url: string, params?: Dictionary, success?: () => unknown): void {
        this.http().post(this.#getApiUrl(url), params, { responseType: 'blob', observe: 'response' }).subscribe((r) => this.parseBlob(r, success));
    }
}

export abstract class HttpInjectWrapper extends HttpWrapper {
    #http = inject(HttpClient);
    override http = (): HttpClient => this.#http;
}
