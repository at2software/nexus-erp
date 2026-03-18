import { forkJoin } from "rxjs";
import { PluginLink } from "@models/pluginLink/plugin-link.model";
import { Label } from "@models/tasks/label.model";
import { User } from "@models/user/user.model";
import { GitLabPlugin } from "./plugin.gitlab";
import { Task } from "@models/tasks/task.model";

export class GitLabSubPlugin extends GitLabPlugin {

    #pname: string = ''
    #users: User[] = []
    #labels: Label[] = []
    
    canCreateTasks = ():boolean => true

    getHref = () => this._baseUrl
    getName = () => this._baseUrl ? this.#pname : this.#getRepositoryName()
    getUsers = () => this.#users
    getUserFor = (userId: string) => this.#users.find(_ => _.id == userId)
    getLabels = () => this.#labels
    getLabelFor = (name: string) => this.#labels.find(_ => _.name == name)
    indexMembers = () => this.get(`members/all`, {}, this.toUser)
    indexLabels = () => this.get('labels', {}, (_: any) => new Label(_.color, _.name, _.id))
    indexTasks = () => this.aget('issues?scope=all&per_page=100', {}, this.toTask)
    indexOpenTasks = () => this.aget(`issues?assignee_id=${this.myUser().id}&state=opened`, {}, this.toTask)
    showProject = () => this.get('')
    toPluginLink = (id: string) => PluginLink.fromJson({ type: 'git', 'url': this.enc.value.url + 'projects/' + id })
    #getRepositoryName = () => this._baseUrl.replace(/(https?:\/\/)?([^/]*).*/, '$2')

    create = (_: Task) => this.post('issues', this.toGitIssue(_))
    close = (_: Task) => this.put('issues/' + _.id, { state_event: 'close' })
    reopen = (_: Task) => this.put('issues/' + _.id, { state_event: 'reopen' })
    destroy = (_: Task) => this.delete('issues/' + _.id)
    assign = (_: Task, user: User) => this.put('issues/' + _.id, { assignee_id: user.id })
    addLabel = (_: Task, label: string) => this.put('issues/' + _.id, { add_labels: label })
    removeLabel = (_: Task, label: string) => this.put('issues/' + _.id, { remove_labels: label })

    protected connectSub = (pluginLink?: PluginLink): Promise<void> => new Promise<void>((resolve) => {
        forkJoin([this.indexMembers(), this.indexLabels(), this.showProject()]).subscribe((data: any) => {
            this.#users = data[0]
            this.#labels = data[1]
            this.#pname = data[2].name
            if (pluginLink && pluginLink.name != this.#pname) {
                pluginLink.update({ name: this.#pname }).subscribe()
            }
            resolve()
        })
    })
}