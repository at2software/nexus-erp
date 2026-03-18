import { Observable } from "rxjs";
import { IPlugin } from "./plugin.instance";
import { User } from "../user/user.model";

export abstract class IChatPlugin extends IPlugin {
    IChatPluginProperty:boolean
    posts:any[]
    index:()=>Observable<any>
    send:(message:string)=>Observable<any>
    link:()=>string
    abstract getUser: (userId:string) => User|undefined
}