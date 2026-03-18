import { catchError, forkJoin, of } from "rxjs";
import { Task } from "../tasks/task.model";
import { PluginLink } from "../pluginLink/plugin-link.model";
import { MantisPlugin } from "./plugin.mantis";

export class MantisSubPlugin extends MantisPlugin {

    tasks: Task[] = []

    projectId: string

    myUser = () => (this.baseInstance as MantisPlugin)._myUser

    getHref = () => this._baseUrl
    getName = () => this._name
    getUsers = () => this._users
    getUserFor = (userId: string) => this._users.find(_ => _.id == userId)
    getLabels = () => this._labels
    getLabelFor = (name: string) => this._labels.find(_ => _.name == name)
    
    indexMembers = () => this.get(`projects/${this.projectId}/users`)
    indexLabels = () => this.get(`projects/${this.projectId}/versions`)
    indexTasks = (filterId?: string) => {
        let queryParams = `project_id=${this.projectId}`;
        const configuredFilterId = filterId || this.enc?.value?.filterId;
        if (configuredFilterId) {
            queryParams += `&filter_id=${configuredFilterId}`;
        }
        return this.aget(`issues?${queryParams}`, {}, this.toTask);
    }
    indexOpenTasks = () => this.aget(`issues?filter_id=assigned`, {}, this.toTask)
    showProject = () => this.get('projects/' + this.projectId)
    toPluginLink = (id: string) => PluginLink.fromJson({ type: 'mantis', 'url': this.enc.value.url + 'projects/' + id + '/' })

    protected connectSub = (): Promise<void> => new Promise<void>((resolve, reject) => {
        this.projectId = this._baseUrl.substring(this.enc.value.url.length).replace(/projects\/(\d*).*$/, "$1")
        forkJoin([this.showProject(), this.indexMembers(), this.indexLabels()])
        .pipe(catchError(() => { reject(); return of([]) }))
        .subscribe((data: any) => {
            this.versions = data[0].projects[0].versions
            this._name = data[0].projects[0].name
            this.categories = data[0].projects[0].categories
            this._users = data[1].users.map(this.toUser)
            this._labels = data[2].versions
            .filter((_:any) => !_.obsolete)
            .map(this.toLabel)
            resolve()
        })
    })
}