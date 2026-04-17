import { inject, Injectable, Type } from "@angular/core";
import { IPlugin, PluginInstance } from "./plugin.instance";
import { Encryption } from "../encryption/encryption.model";
import { MattermostPlugin } from "./plugin.mattermost";
import { GitLabPlugin } from "./plugin.gitlab";
import { NxGlobal } from "src/app/nx/nx.global";
import { HttpClient } from "@angular/common/http";
import { MantisPlugin } from "./plugin.mantis";
import { SlackPlugin } from "./plugin.slack";
import { LocalAIPlugin } from "./plugin.localai";
import { PluginLink } from "../pluginLink/plugin-link.model";
import { TaskService } from "@models/tasks/task.service";

// Lazy-loaded sub-plugin classes to avoid circular dependencies
let MantisSubPlugin: Type<PluginInstance> | null = null;
let GitLabSubPlugin: Type<PluginInstance> | null = null;

// Initialize sub-plugins asynchronously
Promise.all([
    import("./plugin.mantis-sub").then(m => MantisSubPlugin = m.MantisSubPlugin),
    import("./plugin.gitlab-sub").then(m => GitLabSubPlugin = m.GitLabSubPlugin)
]).catch();

export interface TPluginAllocations { type: Type<PluginInstance>, sub?: () => Type<PluginInstance> | null }

const PLUGIN_TYPES: Record<string, TPluginAllocations> = {
    //'nexus'    : { type: TaskService },
    'mattermost': { type: MattermostPlugin },
    'git'       : { type: GitLabPlugin, sub: () => GitLabSubPlugin },
    'mantis'    : { type: MantisPlugin, sub: () => MantisSubPlugin },
    'slack'     : { type: SlackPlugin },
    'local_ai'  : { type: LocalAIPlugin },
}

@Injectable({ providedIn: 'root' })
export class PluginInstanceFactory {

    currentId: number = 0
    http = inject(HttpClient)
    nexusTaskInstance: TaskService = inject(TaskService)
    instances: Record<string, PluginInstance> = {}

    /**
     * Get the user selection modal component for a plugin instance
     */
    static async getModalComponentForPlugin(pluginInstance: PluginInstance): Promise<any> {
        const pluginTypeName = pluginInstance.getPluginTypeName()
        
        try {
            switch(pluginTypeName) {
                case 'mantisbt':
                    return (await import('../../app/_modals/mantis-user-selection/mantis-user-selection.component')).MantisUserSelectionComponent
                case 'gitlab':
                case 'gitea':
                    return (await import('../../app/_modals/git-user-selection/git-user-selection.component')).GitUserSelectionComponent
                case 'mattermost':
                    return (await import('../../app/_modals/mattermost-user-selection/mattermost-user-selection.component')).MattermostUserSelectionComponent
                default:
                    console.warn(`No modal component found for plugin type: ${pluginTypeName}`)
                    return null
            }
        } catch (error) {
            console.error(`Failed to load modal component for plugin type ${pluginTypeName}:`, error)
            return null
        }
    }

    constructor() {
        this.nexusTaskInstance.init.next()
    }

    getPluginEncryptionsOfType = (type: string): Encryption[] => NxGlobal.global.encryptions.filter(_ => _.key === type)
    getPluginEncryptions = (): Encryption[] => NxGlobal.global.encryptions.filter(_ => _.key in PLUGIN_TYPES)
    getPluginInstances = (): PluginInstance[] => {
        const instances = NxGlobal.global.encryptions
            .filter(_ => _.key in PLUGIN_TYPES)
            .map(_ => this.instanceFor(_))
            .filter(_ => _ !== undefined) as PluginInstance[]
        instances.unshift (this.nexusTaskInstance)
        return instances
    }
    getRootPluginInstancesOfType = <T extends IPlugin>(interfaceType: Type<T>): (PluginInstance & T)[] => 
        this.getPluginInstances().filter(_ => _ && _ instanceof interfaceType && _.isRootInstance()) as (PluginInstance & T)[]
    getPluginInstancesOfType = <T extends IPlugin>(interfaceType: Type<T>): (PluginInstance & T)[] => 
        this.getPluginInstances().filter(_ => _ && _ instanceof interfaceType) as (PluginInstance & T)[]
    getRootPluginInstancesByConstructor = <T extends PluginInstance>(ctor: Type<T>): T[] => this.getPluginInstances().filter(_ => _ && _ instanceof ctor && _.isRootInstance()) as T[]

    /**
     * Get all repository (Git) instances for a project
     */
    getRepositoryInstances(project: any): PluginInstance[] {
        if (!project || !project.plugin_links) return []
        return project.plugin_links
            .map((link: PluginLink) => this.instanceFor(link))
            .filter((inst: PluginInstance | undefined) => inst && 'IRepositoryPluginProperty' in inst) as PluginInstance[]
    }

    /**
     * Get all task (Git, MantisBT) instances for a project
     */
    getTaskInstances(project: any): PluginInstance[] {
        if (!project || !project.plugin_links) return []
        return project.plugin_links
            .map((link: PluginLink) => this.instanceFor(link))
            .filter((inst: PluginInstance | undefined) => inst && 'ITaskPluginProperty' in inst) as PluginInstance[]
    }

    /**
     * Get all chat (Mattermost, Slack) instances for a project
     */
    getChatInstances(project: any): PluginInstance[] {
        if (!project || !project.plugin_links) return []
        return project.plugin_links
            .map((link: PluginLink) => this.instanceFor(link))
            .filter((inst: PluginInstance | undefined) => inst && 'IChatPluginProperty' in inst) as PluginInstance[]
    }

    /**
     * Get all instances of specified types for a project (generic method)
     * @param project - Project with plugin_links
     * @param propertyNames - Array of property names to filter by (e.g., ['ITaskPluginProperty', 'IChatPluginProperty'])
     * @returns Array of matching plugin instances
     */
    getInstances(project: any, propertyNames: string[]): PluginInstance[] {
        if (!project || !project.plugin_links) return []
        const seen = new Set<PluginInstance>()
        return project.plugin_links
            .map((link: PluginLink) => this.instanceFor(link))
            .filter((inst: PluginInstance | undefined) => {
                if (!inst) return false
                // Check if instance has any of the specified properties
                const hasProperty = propertyNames.some(propName => propName in inst)
                // Avoid duplicates when instance implements multiple interfaces
                if (hasProperty && !seen.has(inst)) {
                    seen.add(inst)
                    return true
                }
                return false
            }) as PluginInstance[]
    }

    /**
     * Get plugin instance for an object with plugin_links, preferring project-specific sub-instances
     * @param object - Object with plugin_links property (e.g., Project)
     * @param constructorName - Constructor name to filter by (e.g., 'MantisSubPlugin', 'GitLabSubPlugin')
     * @returns Plugin instance or undefined
     */
    instancesFor<T extends PluginInstance>(object: any, ctor?: Type<T>): T | undefined {
        if (!object || !('plugin_links' in object) || !object.plugin_links) {
            return undefined
        }
        
        const link = object.plugin_links.find((link: PluginLink) => {
            const instance = this.instanceFor(link)
            if (!instance) return false
            if (ctor) {
                return instance instanceof ctor
            }
            return true
        })
        return link ? this.instanceFor(link) as T : undefined
    }

    instanceFor(encryption: Encryption): PluginInstance | undefined;
    instanceFor(url: string): PluginInstance | undefined;
    instanceFor(url: PluginLink): PluginInstance | undefined;
    instanceFor(obj: Encryption | string | PluginLink): PluginInstance | undefined {

        let url: string | undefined = undefined
        
        if (!obj) return undefined
        if (obj instanceof Encryption) {
            url = obj.value.url
        }
        else if (obj instanceof PluginLink) url = obj.url
        else url = obj
        if (!url) {
            return undefined
        }
        if (url in this.instances) {
            return this.instances[url] // already initialized
        }
        if (obj instanceof Encryption) {
            if (obj.key in PLUGIN_TYPES) {
                // create new base instance
                const PluginClass = PLUGIN_TYPES[obj.key].type;
                const instance: PluginInstance = new PluginClass();
                instance._http = this.http;
                instance.load(url, obj);
                instance.id = this.currentId++;
                this.instances[url] = instance;
                return instance;
            }
        }
        else if (obj instanceof PluginLink) {
            const result = this.findInstance(obj.url);
            let instance = result[0];
            const enc = result[1];
            if (instance && enc) {
                instance.load(url, enc, this.instanceFor(enc), obj)
            } else {
                // no encryption token found - returning placeholder instance instead
                instance = this.getInstanceFor(obj.type)
                if (instance) {
                    instance._http = this.http
                    instance._baseUrl = obj.url
                    instance.state = 'no token'
                    this.instances[url] = instance
                }
            }
            return instance ?? undefined
        } else {    // resolve by string
            const [instance, enc] = this.findInstance(obj)
            if (instance && enc) {
                instance.load(url, enc, this.instanceFor(enc))
            }
        }
        return undefined
    }
    findInstance(url:string) : [PluginInstance,Encryption] | [null,null] {
        for (const enc of NxGlobal.global.encryptions) {
            if (url.startsWith(enc.value.url)) {
                // create sub instance
                const instance = this.getInstanceFor(enc.key)
                if (!instance) continue
                instance._http = this.http
                instance.id = this.currentId++
                this.instances[url] = instance
                return [instance, enc]
            }
        }
        return [null, null]
    }
    getInstanceFor = (key: string): PluginInstance | null => {
        const pluginConfig = PLUGIN_TYPES[key]
        if (!pluginConfig) return null
        
        // Use sub-plugin class if available and loaded, otherwise main type
        const SubPluginClass = pluginConfig.sub?.()
        const PluginClass = SubPluginClass || pluginConfig.type
        return new PluginClass()
    }

    static getInstances<T>(links: PluginLink[], ctorName: string): Promise<(PluginInstance & T)[]> {
        return new Promise<(PluginInstance & T)[]>(resolve => {
            const instances = links.
                map(_ => NxGlobal.nxService.pluginInstanceFactory.instanceFor(_)).
                filter(_ => _ && ctorName + 'Property' in _)
            Promise.
                all(instances.map(_ => _!.init)).
                then(() => {
                    resolve(instances as unknown[] as (PluginInstance & T)[])
                })
        })
    }
}
