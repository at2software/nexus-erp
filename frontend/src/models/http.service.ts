import { HttpClient, HttpHeaders, HttpResponse } from "@angular/common/http"
import { Injectable, Type, inject } from "@angular/core"
import { Router } from "@angular/router"
import { catchError, map, Observable, of } from "rxjs"
import { Dictionary } from "src/constants/constants"
import { environment } from "src/environments/environment"
import { NotificationCenter, NotificationType } from "./notification.service"

export type TRETURN = <T extends object>(x: T) => void
export type API_ARGS_NOTYPE = [url:string, data?:Dictionary]
export interface T_SPREAD {url:string, data:any, headers: ()=>{headers: HttpHeaders}}

@Injectable({ providedIn: 'root' })
export abstract class BaseHttpService<T_API extends unknown[] = API_ARGS_NOTYPE> {

    API_URL = environment.envApi

    protected http: HttpClient = inject(HttpClient)
    protected router: Router = inject(Router)

    protected errorPipe = catchError((err: any) => {
        if (err.status == 401) {
            console.trace('Not authenticated. Redirecting to login')
            localStorage.removeItem('currentUser')
            localStorage.removeItem('token')
            this.router.navigate(['/login']);
        }
        return of([]);
    })

	TYPE = ():Type<any> => Object   // will be assumed, if no type is specified for requests
    T_API_COUNT = () => 2

    next = <T>(url: string): Observable<T> => this.http.get(url, this._headers()) as Observable<T>

    request <T>(fn: (..._:T_API) => Observable<any>, ...args:T_API) {
        const url = args[0]
        return this.pipe<T>((this as any)[fn.name](...args), { key: fn.name, value: url })
    }
    
    get       <U=any>(..._:T_API) { return this.request<U>(this._get, ..._) }
    aget      <U=any>(..._:T_API) { return this.request<U[]>(this._get, ..._) }
    delete    <U=any>(..._:T_API) { return this.request<U>(this._delete, ..._) }
    put       <U=any>(..._:T_API) { return this.request<U>(this._put, ..._) }
    post      <U=any>(..._:T_API) { return this.request<U>(this._post, ..._) }
    paginate  <U=any>(..._:T_API) { return this.request<{data:U[]}>(this._get, ..._) }

    getFile(url: string, params?: Dictionary, success?:()=>unknown): void {

        this.http.get(this.API_URL + this._appendUriParams(url, params), { responseType: 'blob', observe: 'response' }).subscribe((res: HttpResponse<Blob>) => {
            const contentType = res.headers.get('Content-Type')?.split(';')[0] ?? 'application/pdf'
            const fileName = res.headers.get('Content-Disposition')?.match(/['"](.*?)['"]/)

            const _ = new Blob([res.body!], { type: contentType })
            const a = document.createElement('a')
            document.body.appendChild(a)
            const url = window.URL.createObjectURL(_)
            a.href = url
            a.download = fileName ? fileName[1] : 'download.pdf' //res.headers.get('Filename') as string;
            a.click()
            setTimeout(() => {
                window.URL.revokeObjectURL(url)
                document.body.removeChild(a)
                if (success) success()
            }, 0)
        })
    }

    protected _headers = (_:any = {}): { headers: HttpHeaders } => ({ 'headers': new HttpHeaders(_) })
    protected _appendUriParams = (url: string, params: any = {}) => {
        return (params && Object.keys(params).length) ? url + '?' + new URLSearchParams(params).toString() : url
    }
    
    protected _get(..._:T_API)    { const {url, headers } = this._spreadG(..._); return this.http.get(url, headers()) }
    protected _delete(..._:T_API) { const {url, headers } = this._spreadG(..._); return this.http.delete(url, headers()) }
    protected _put(..._:T_API)    { const {url, data, headers } = this._spreadP(..._); return this.http.put(url, data, headers()) }
    protected _post(..._:T_API)   { const {url, data, headers } = this._spreadP(..._); return this.http.post(url, data, headers()) }

    protected _spreadG = (..._:T_API):T_SPREAD => ({ url:this._appendUriParams(this.API_URL + _[0], _[1]), data: {}, headers: this._headers })
    protected _spreadP = (..._:T_API):T_SPREAD => ({ 
        url:this._appendUriParams(this.API_URL + _[0]), 
        data: JSON.stringify(_[1]), 
        headers: () => this._headers({ 'Content-Type': 'application/json' })
    })

    protected pipe<U=any>(r: Observable<any>, notification: NotificationType | undefined = undefined): Observable<U> {
        return r.pipe(this.errorPipe, map((response: any) => {
            if (notification !== undefined) {	// inform subscribers about succesful request
                NotificationCenter.subj.next(notification)
            }
            if (!(response instanceof Object)) {
                return response
            }
            let data = 'data' in response ? response.data : response
            if (Array.isArray(data)) {
                data = data.map(_ => this._converted<U>(_))
            } else {
                data = this._converted<U>(data)
            }
            if ('data' in response) {
                response.data = data
            }
            else {
                response = data
            }
            return response
        }))
    }
    protected _converted = <T>(_:any):T => _
}