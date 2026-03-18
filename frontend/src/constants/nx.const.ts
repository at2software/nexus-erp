import { Observable } from 'rxjs';
import { Dictionary, REFLECTION } from "./constants";
import { NxGlobal } from "src/app/nx/nx.global";

export const Await = <T>(o:Observable<T>):Promise<T> => new Promise(resolve => o.subscribe(_ => resolve(_)))

export class REST {
    static Await = <T>(o:Observable<T>):Promise<T> => new Promise(resolve => o.subscribe(_ => resolve(_)))
    static Resolve = async (p:Observable<any>) => REFLECTION(await REST.Await(p))
    static Get = (url:string, params:Dictionary|undefined = undefined):Promise<any> => REST.Resolve(NxGlobal.service.get(url, params))
    static Post = (url:string, data = {}):Promise<any> => REST.Resolve(NxGlobal.service.post(url, data))
}