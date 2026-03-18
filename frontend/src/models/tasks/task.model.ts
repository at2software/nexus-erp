import { Serializable } from "../serializable"
import { ITaskPlugin } from "./task.plugin.interface"
import { HttpWrapper } from "../http/http.wrapper"
import { TaskService } from "./task.service"
import { Assignee } from "@models/assignee/assignee.model"
import { AutoWrap } from "@constants/autowrap"
import type { User } from "@models/user/user.model"
import type { Project } from "@models/project/project.model"
import { REFLECTION } from "@constants/constants"
import { getTaskActions } from "./task.actions"
import { Accessor } from "@constants/accessor"

export class Task extends Serializable {

    static API_PATH = (): string => 'tasks'
    SERVICE = TaskService

    project_id    : string           = ''
    user_id       : string           = ''
    user_name     : string           = ''         // only from external
    assignment_id : string           = ''
    task_id       : string           = ''
    name          : string           = ''
    description   : string           = ''
    duration      : number           = 0
    state         : number           = 0
    labels        : string[]         = []
    href          : string|undefined = undefined
    project_url   : string|undefined = undefined
    project_name  : string|undefined = undefined
    link          :string|undefined  = undefined

    @Accessor(REFLECTION) parent: User|Project|undefined
    @AutoWrap('Assignee') assignee      : Assignee

    declare httpService:ITaskPlugin&HttpWrapper
    
    doubleClickAction = 0
    actions = getTaskActions(this)

    getUser = () => this.httpService.getUserFor(this.user_id)
    web_url = () => `projects/${this.project_id}/tasks`

}