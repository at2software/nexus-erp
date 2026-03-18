import { Observable } from "rxjs";
import { IPlugin } from "../http/plugin.instance";
import { Task } from "./task.model";
import { User } from "../user/user.model";
import { Label } from "./label.model";

export abstract class ITaskPlugin extends IPlugin {

    ITaskPluginProperty:boolean
    tasks:Task[] = []
    
    myUser : () => User|undefined

    indexTasks  : (filterId?: string) => Observable<Task[]>    

    getUsers    : () => User[]
    getUserFor: (userId:string) => User|undefined
    getLabels   : () => Label[]
    getLabelFor : (name:string) => Label|undefined    

    create     : (_:Task) => Observable<any>
    close      : (_:Task) => Observable<any>
    reopen     : (_:Task) => Observable<any>
    destroy    : (_:Task) => Observable<any>
    assign     : (task:Task, user:User) => Observable<any>
    addLabel   : (task: Task, _:string) => Observable<Task>
    removeLabel: (task: Task, _:string) => Observable<Task>

    open:(task: Task)=>void
}