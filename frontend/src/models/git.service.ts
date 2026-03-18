import { Injectable, inject } from "@angular/core";
import { BaseHttpService } from "./http.service";
import { HttpHeaders } from "@angular/common/http";
import { GlobalService } from "./global.service";
import { Project } from "src/models/project/project.model";
import { Dictionary } from "src/constants/constants";

interface IUser {
    id: string;
    name: string;
}

type API_ARGS_GIT = [url: string, data: Dictionary|undefined, instance:GitServiceInstance, rawUrl?:boolean]

@Injectable({ providedIn: 'root'})
export class GitService extends BaseHttpService<API_ARGS_GIT> {

    #instances:GitServiceInstance[] = []
    #initialized = false
    #global = inject(GlobalService)

    initAll = () => new Promise<void>((resolve) => {
        if (this.#initialized) return resolve()
        this.#instances = this.getRepositories().map(_ => new GitServiceInstance(_))
        const checks = this.#instances.map(_ => this.#initInstance(_))
        Promise.all(checks).then(() => {
            this.#initialized = true
            resolve()
        })
    })
    #initInstance = (i:GitServiceInstance) => new Promise<void>(resolve => {
        this.get('user', undefined, i).subscribe((result:any) => {
            i.isAvailable = true
            i.user = GitService.pipeToUser(result)
            resolve()
        })
    })

    instanceAndPath (project:Project):[GitServiceInstance, string]|[undefined, undefined] {
        for (const p of project.plugin_links) {
            const instance = this.#instances.find(_ => p.url.startsWith(_.url))
            if (instance) {
                const path = p.url.substring(instance.url.length)
                return [instance, path]
            }
        }
        return [undefined, undefined]
    }
    instanceFor = (project:Project) => {
        const [instance] = this.instanceAndPath(project)
        return instance
    }
    serviceFor = (project:Project):GitService|undefined => {
        this.instanceAndPath(project)
        return this
    }
    getRepositories = () => this.#global.getEnc('git')

    protected override _spreadG = (...[url, data, instance, rawUrl]:API_ARGS_GIT) => ({ 
        url:this._appendUriParams((rawUrl ? '' : instance.url + 'api/v4/') + url, data), 
        data: {}, 
        headers: instance.headers 
    })
    protected override _spreadP = (...[url, data, instance, rawUrl]:API_ARGS_GIT) => ({ 
        url:this._appendUriParams((rawUrl ? '' : instance.url + 'api/v4/') + url), 
        data: JSON.stringify(data), 
        headers: instance.headers 
    })
    
    static pipeToUser = (_:any):IUser => ({id: _.id as string, name: _.name as string})

}

export class GitServiceInstance {
    url:string
    token:string
    user:IUser
    users:IUser[]
    isAvailable:boolean = false
    constructor(encData:any, ) {
        this.url = encData.url
        this.token = encData.token
    }
    headers = () => ({ 'headers': new HttpHeaders({ 
        'Authorization': `Bearer ${this.token}`, 
        'Content-Type': 'application/json',
    }) })
}