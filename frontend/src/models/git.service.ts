import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { GlobalService } from './global.service';
import { Project } from '@models/project/project.model';
import { Dictionary } from '@constants/constants';
import { firstValueFrom } from 'rxjs';

interface IUser {
    id: string;
    name: string;
}

@Injectable({ providedIn: 'root' })
export class GitService {
    #instances: GitServiceInstance[] = [];
    #initialized = false;
    #global = inject(GlobalService);
    #http = inject(HttpClient);

    initAll = () =>
        new Promise<void>((resolve) => {
            if (this.#initialized) { resolve(); return; }
            this.#instances = this.getRepositories().map((_) => new GitServiceInstance(_));
            Promise.all(this.#instances.map((_) => this.#initInstance(_))).then(() => {
                this.#initialized = true;
                resolve();
            });
        });

    #initInstance = async (i: GitServiceInstance): Promise<void> => {
        try {
            const result: any = await firstValueFrom(this.#http.get(this.#urlFor(i, 'user'), i.headers()));
            i.isAvailable = true;
            i.user = GitService.pipeToUser(result);
        } catch {
            i.isAvailable = false;
        }
    };

    instanceAndPath(project: Project): [GitServiceInstance, string] | [undefined, undefined] {
        for (const p of project.plugin_links) {
            const instance = this.#instances.find((_) => p.url.startsWith(_.url));
            if (instance) {
                return [instance, p.url.substring(instance.url.length)];
            }
        }
        return [undefined, undefined];
    }
    instanceFor = (project: Project) => this.instanceAndPath(project)[0];
    serviceFor = (project: Project): GitService | undefined => (this.instanceAndPath(project)[0] ? this : undefined);
    getRepositories = () => this.#global.getEnc('git');

    /** Builds an API v4 URL for the given instance, optionally with query params. */
    #urlFor = (instance: GitServiceInstance, path: string, params?: Dictionary, rawUrl = false) => {
        const base = rawUrl ? '' : instance.url + 'api/v4/';
        const query = params && Object.keys(params).length ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
        return base + path + query;
    };

    get = <T = unknown>(path: string, data: Dictionary | undefined, instance: GitServiceInstance, rawUrl?: boolean) =>
        this.#http.get<T>(this.#urlFor(instance, path, data, rawUrl), instance.headers());

    post = <T = unknown>(path: string, data: Dictionary | undefined, instance: GitServiceInstance, rawUrl?: boolean) =>
        this.#http.post<T>(this.#urlFor(instance, path, undefined, rawUrl), data, instance.headers());

    static pipeToUser = (_: any): IUser => ({ id: _.id as string, name: _.name as string });
}

export class GitServiceInstance {
    url: string;
    token: string;
    user!: IUser;
    users: IUser[] = [];
    isAvailable: boolean = false;
    constructor(encData: any) {
        this.url = encData.url;
        this.token = encData.token;
    }
    headers = () => ({
        headers: new HttpHeaders({
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
        }),
    });
}
