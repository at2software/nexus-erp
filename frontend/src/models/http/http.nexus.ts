import { Injectable, Type, inject } from "@angular/core";
import { Dictionary } from "src/constants/constants";
import { environment } from "src/environments/environment";
import { Observable, catchError, of } from "rxjs";
import { Serializable } from "src/models/serializable";
import { Router } from "@angular/router";
import { HttpInjectWrapper } from "./http.wrapper";

type API_ARGS<U> = [url: string, payload?: any, type?: Type<U>]

@Injectable({ providedIn: 'root' })
export abstract class NexusHttpService<T extends Serializable> extends HttpInjectWrapper {

    router = inject(Router)

    public abstract apiPath:string   

    TYPE = (): Type<any> => Object
    baseUrl = () => environment.envApi

	index = (filters?:Dictionary):Observable<T[]> => this.aget(this.apiPath, filters)
    get      <U = T>(...args: API_ARGS<U>): Observable<U> { return this.#perform('get', ...args) }
    
    aget     <U = T>(...args: API_ARGS<U>): Observable<U[]> { return this.#perform('get', ...args) }
    delete   <U = T>(...args: API_ARGS<U>): Observable<U> { return this.#perform('delete', ...args) }
    put      <U = T>(...args: API_ARGS<U>): Observable<U> { return this.#perform('put', ...args) }
    post     <U = T>(...args: API_ARGS<U>): Observable<U> { return this.#perform('post', ...args) }
    paginate <U = T>(...args: API_ARGS<U>): Observable<U> { return this.#perform('get', ...args) }
    show(..._args:any) {
        // empty
    }

    /**
     * sorts out method overloading possibilities and returns a complete set of URL, Payload and Type
     * @param url string 
     * @param $2 object|type Either the payload or the ctor of the desired object
     * @param param0 ctor of the desired object
     * @returns { url: string, params: any, type: Type<U> } typesafe set
     */
    #defined = <U>(...[url, $2, type]: API_ARGS<U>): { url: string, params: any, type: Type<U> } => {
        if ((typeof $2) == 'function') return { url: url, params: {}, type: $2 }    // only url and type are used
        if (type) return { url: url, params: $2 || {}, type: type }                 // type is requested as well
        if (!$2) return { url: url, params: {}, type: this.TYPE() }                 // only the URL is used
        return { url: url, params: $2, type: this.TYPE() }                          // only url and params are used
    }
    #perform = <U, V = U>(fn: "get" | "delete" | "put" | "post" | "patch", ...args: API_ARGS<U>): Observable<V> => {
        const { url, params, type } = this.#defined(...args)
        return this.performRequest(fn, url, params, type).pipe(this.#errorPipe) as Observable<V>        
    }
    // overrides parent method
    _map = <U>(result: any, ctor: Type<U>): U => {
        if (!ctor) {
            return result
        }
        if ('fromJson' in ctor && typeof (ctor as any).fromJson === 'function') {
            return (ctor as any).fromJson(result) as U;
        }
        return result
    }
    #errorPipe = catchError((err: any) => {
        if (err.status == 401) {
            console.trace('Not authenticated. Redirecting to login')
            localStorage.removeItem('currentUser')
            localStorage.removeItem('token')
            this.router.navigate(['/login']);
        }
        return of([]);
    })
}