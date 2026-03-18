import { HttpClient, HttpHeaders, HttpResponse } from "@angular/common/http";
import { inject } from "@angular/core";
import { Observable, ObservableInput, OperatorFunction, catchError, map, of, tap } from "rxjs";
import { Toast } from "src/app/_shards/toast/toast";
import { Dictionary } from "src/constants/constants";

export type CUSTOM_PIPE = (op1: OperatorFunction<any, unknown>) => Observable<unknown>
export type T_METHOD = 'get' | 'delete' | 'put' | 'post' | 'patch'

export abstract class HttpWrapper {

    _baseUrl:string
    _http:HttpClient
    
    baseUrl = (): string => this._baseUrl
    #getApiUrl = (url:string, params: any = {}) => {
        let myUrl:string = url.match(/^https?:/i) ? url : this.baseUrl() + url
        if (params && Object.keys(params).length) {
            // Handle arrays by joining them with commas
            const processedParams: any = {};
            for (const [key, value] of Object.entries(params)) {
                if (Array.isArray(value)) {
                    // Join array values with commas
                    processedParams[key] = value.join(',');
                } else {
                    processedParams[key] = value;
                }
            }
            myUrl += '?' + new URLSearchParams(processedParams).toString()
        }
        return myUrl
    }

    http = ():HttpClient => this._http

    _map    = (_: any, ..._args:any) => _
    _getBlob    = (url: string, params?: any, ..._args:any) => this.http().get(this.#getApiUrl(url, params), {responseType: 'blob'})
    _postBlob    = (url: string, data?: any, ..._args:any) => this.http().post(this.#getApiUrl(url), data, {responseType: 'blob', observe: 'response'})
    
    get    (url:string, params?:any, ...args:any) { return this.performRequest('get', url, params, ...args) }
    getBlob (url:string, params?: any) { return this._getBlob(url, params) }
    aget   (url:string, params?:any, ...args:any) { return this.performRequest('get', url, params, ...args) }
    delete (url:string, params?:any, ...args:any) { return this.performRequest('delete', url, params, ...args) }
    put    (url:string, params?:any, ...args:any) { return this.performRequest('put', url, params, ...args) }
    post   (url:string, params?:any, ...args:any) { return this.performRequest('post', url, params, ...args) }
    postBlob   (url:string, data?:any, success?:()=>void) { return this._postBlob(url, data).subscribe((_) => this.parseBlob(_, success)) }
    patch   (url:string, params?:any, ...args:any) { return this.performRequest('patch', url, params, ...args) }
    next = <T>(url: string): Observable<T> => this.performRequest('get', url) as Observable<T>

    performRequest = (method: T_METHOD, url: string, params?: any, ...args:any): Observable<any> => {
        
        const options: any = {
            observe: 'response',
            headers: new HttpHeaders()
        }

        if (['get', 'delete'].includes(method)) {
            url = this.#getApiUrl(url, params)
        } else {
            url = this.#getApiUrl(url)
            options.body = params; // payload for POST, PUT, PATCH
        }

        const lastModified = sessionStorage.getItem('last-modified-' + url)
        if (lastModified) {
            options.headers.set('If-Modified-Since', lastModified);
        }

        const fn = this.http().request(method, url, options);

        const request = fn.pipe(
            catchError(this.#catchError),
            tap((response: any) => this.#handleLastModified(response)),
            map(_ => this.#pipe(_.body, ...args))
        )
        return request
    }

    #handleLastModified(response:any) {
        if (!response?.headers?.get('Last-Modified')) return
        const lastModified = response.headers.get('Last-Modified');
        if (lastModified) {
            sessionStorage.setItem('last-modified-' + response.url, lastModified);
        }
    }

    
    //#appendUriParams = (url: string, params: any = {}) => (params && Object.keys(params).length) ? url + '?' + new URLSearchParams(params).toString() : url
    #pipe = (result: any, ...args:any) => {
        if (!result) return result
        let fnMap = this._map
        if (args.length && args[0] && !args[0].prototype) { // first argument is a custom pipe function
            fnMap = args[0]
        }
        if (Array.isArray(result)) {
            return result.map((_: any[]) => fnMap(_, ...args))
        }
        if (typeof result == 'object') {
            if ('data' in result) {
                result['data'] = result['data'].map((_: any[]) => fnMap(_, ...args))
                return result
            }
            return fnMap(result, ...args)
        }
        return result
    }
    #catchError (err: any, _caught: Observable<any>): ObservableInput<any> {
        if (typeof err == 'object' && err.status >= 400) {
            console.log(err)
            Toast.error(err.error?.message ?? err.error?.error_description ?? err.statusText)
        }
        return of(undefined)
    }
    parseBlob(res: HttpResponse<Blob>, success?:()=>void) {
        const contentType = res.headers.get('Content-Type')?.split(';')[0] ?? 'application/pdf'
        const fileName    = res.headers.get('Content-Disposition')?.match(/['"](.*?)['"]/)
        const blob        = new Blob([res.body!], { type: contentType })
        const a           = document.createElement('a')
        const url         = window.URL.createObjectURL(blob)
        document.body.appendChild(a)
        a.href = url
        a.download = fileName ? fileName[1] : 'download.pdf'
        a.click()
        setTimeout(() => {
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
            if (success) success()
        })
    }
    getFile(url: string, params?: Dictionary, success?:()=>unknown): void {
        const downloadUrl = this.#getApiUrl(url, params)
        this.http().get(downloadUrl, { responseType: 'blob', observe: 'response' }).subscribe((r) => this.parseBlob(r, success))
    }
    postFile(url: string, params?: Dictionary, success?:()=>unknown): void {
        this.http().post(this.#getApiUrl(url), params, { responseType: 'blob', observe: 'response' }).subscribe((r) => this.parseBlob(r, success))
    }
}

export abstract class HttpInjectWrapper extends HttpWrapper {
    #http = inject(HttpClient)
    http = ():HttpClient => this.#http
}