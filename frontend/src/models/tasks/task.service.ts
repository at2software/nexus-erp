import { PluginInstance } from "@models/http/plugin.instance";
import { ITaskPlugin } from "./task.plugin.interface";
import { PluginLink } from "@models/pluginLink/plugin-link.model";
import { User } from "@models/user/user.model";
import { Label } from "./label.model";
import { Task } from "./task.model";
import { NxGlobal } from "@app/nx/nx.global";
import { Observable, of } from "rxjs";
import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "src/environments/environment";

@Injectable({ providedIn: 'root' })
export class TaskService extends PluginInstance implements ITaskPlugin {


    ITaskPluginProperty: boolean;
    tasks: Task[];
    needsHttpInterceptor:boolean = false
    _http = inject(HttpClient)    

    toPluginLink: (id: string) => PluginLink;
    getHref     : () => string;
    addLabel    : (task: Task, _: string) => Observable<Task>;
    removeLabel : (task: Task, _: string) => Observable<Task>;
    getLabelFor : (name: string) => Label | undefined;

    // VCard integration metadata (not used for Nexus tasks)
    getVcardAttributeName     = () => 'X-NEXUS-TASK'
    isUserInInstance          = (): boolean => false
    getProfileUrl             = (): string => ''
    getUserSelectionModalPath = () => ''
    getInterfacePropertyName  = () => 'ITaskPluginProperty'
    getPluginTypeName         = () => 'nexus'

    // TaskService doesn't have external activity
    getActivityComments = (_projectId: string = '', _maxInitialItems: number = 150, _resolveUser?: any): Observable<any[]> => of([])
    baseUrl             = (): string => environment.envApi
    canCreateTasks      = ():boolean => true
    myUser              = () => NxGlobal.global.user
    indexTasks          = () => this.aget('tasks', {}, this.#toTask)
    getUsers            = () => NxGlobal.global.team
    getUserFor          = (userId: string) => this.getUsers().find(_ => _.id === userId)
    getLabels           = () => []
    create              = (_: Task) => _.store()
    close               = (_: Task) => this.put(`tasks/${_.id}`, { state: 1 })
    reopen              = (_: Task) => this.put(`tasks/${_.id}`, { state: 0 })
    destroy             = (_: Task) => this.delete(`tasks/${_.id}`)
    assign              = (_: Task, user: User) => this.put(`tasks/${_.id}`, { assignment_id: user.id })
    icon                = () => 'nexus';
    getName             = () => 'NEXUS';


    load = () => { 
        this.init.next()
        return this 
    }

    open = (_:Task) => {
        // No-op
    }

    protected connect = (): Promise<void> => Promise.resolve()
    protected connectSub = (): Promise<void> => Promise.resolve()

    #toTask = (payload:any):Task => {
        const newTask = Task.fromJson(payload)
        newTask.var.user = this.getUserFor(newTask.assignee?.id)
        newTask.var.compact = (newTask.state == 1)
        newTask.httpService = this
        return newTask
    }
}