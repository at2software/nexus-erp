import { AutoWrapArray } from "@constants/autowrap";
import { Serializable } from "../serializable";
import { Project } from "./project.model";
import { ProjectService } from "./project.service";
import { getFrameworkActions } from "./framework.actions";

export class Framework extends Serializable {
    url: string
    name: string
    framework: string
    framework_version: string
    
    @AutoWrapArray('Project') projects: Project[]

    static API_PATH = (): string => 'projects/frameworks'
    SERVICE = ProjectService

    actions = getFrameworkActions(this)
    
    serialize = (json?: any) => {
        this.url               = json.url || ''
        this.framework         = json.framework || ''
        this.framework_version = json.framework_version || ''
        this.projects          = (json.projects || []).map((p: any) => Project.fromJson(p))
    }
}