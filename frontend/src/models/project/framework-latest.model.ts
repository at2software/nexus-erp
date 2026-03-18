import { Serializable } from "../serializable";
import { ProjectService } from "./project.service";

export class FrameworkLatest extends Serializable {
    name: string
    latest_version: string

    static API_PATH = (): string => 'projects/frameworks/latest'
    SERVICE = ProjectService

    serialize = (json?: any) => {
        this.name = json.name || ''
        this.latest_version = json.latest_version || ''
    }
}