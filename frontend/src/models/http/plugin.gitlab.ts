import { catchError, forkJoin, map, Observable } from "rxjs";
import { PluginInstance } from "./plugin.instance";
import { ITaskPlugin } from "../tasks/task.plugin.interface";
import { Task } from "../tasks/task.model";
import { Label } from "../tasks/label.model";
import { User } from "../user/user.model";
import { PluginLink } from "../pluginLink/plugin-link.model";

export interface IRepositoryPlugin {
    IRepositoryPluginProperty: boolean
}

export class GitLabPlugin extends PluginInstance implements ITaskPlugin, IRepositoryPlugin {
    
    override baseUrl = (): string => this.enc.value.url + 'api/v4/' + this._baseUrl.substring(this.enc.value.url.length) + '/'

    ITaskPluginProperty: boolean = true;
    IRepositoryPluginProperty: boolean = true;
    tasks: Task[] = []

    _myUser:User  

    #users:User[] = []
    #labels:Label[] = []

    myUser      = () => (this.getRootInstance() as GitLabPlugin)._myUser
    icon        = () => 'git'
    getHref     = () => this._baseUrl
    getName     = () => this.#getRepositoryName()
    getUsers    = () => this.#users
    getUserFor  = (userId: string) => this.#users.find(_ => _.id == userId)
    getLabels   = () => this.#labels
    getLabelFor = (name: string) => this.#labels.find(_ => _.name == name)
    
    // VCard integration metadata
    getVcardAttributeName = () => 'X-NEXUS-GIT'
    isUserInInstance = (username: string): boolean => this.#users.some(_ => String(_.var?.data?.username) === String(username))
    getProfileUrl = (username: string): string => {
        const gitUrl = this.enc.value.url.replace(/\/$/, '')
        return `${gitUrl}/${username}`
    }
    getUserSelectionModalPath = () => '../../app/_modals/git-user-selection/git-user-selection.component'
    getInterfacePropertyName = () => 'IRepositoryPluginProperty'
    getPluginTypeName = () => 'gitlab'
    indexMembers = () => this.aget(`${this.enc.value.url}api/v4/users`, {}, this.toUser)
    indexLabels  = () => this.get('labels', {}, (_:any) => new Label(_.color, _.name, _.id))
    indexTasks   = () => this.aget(`issues?assignee_id=${this.myUser().id}&state=opened`, {}, this.toTask)
    showProject = () => this.get('')
    toPluginLink = (id:string) => PluginLink.fromJson({ type: 'git', 'url': this.enc.value.url + 'projects/' + id})
    
    create      = (_: Task) => this.post(_.project_url + 'issues', this.toGitIssue(_))
    close       = (_: Task) => this.put(_.project_url + 'issues/' + _.id, { state_event: 'close' })
    reopen      = (_: Task) => this.put(_.project_url + 'issues/' + _.id, { state_event: 'reopen' })
    destroy     = (_: Task) => this.delete(_.project_url + 'issues/' + _.id)
    assign      = (_: Task, user: User) => this.put(_.project_url + 'issues/' + _.id, { assignee_id: user.id})
    addLabel    = (_: Task, label:string) => this.put(_.project_url + 'issues/' + _.id, { add_labels: label})
    removeLabel = (_: Task, label:string) => this.put(_.project_url + 'issues/' + _.id, { remove_labels: label})

    open = (_:Task) => window.open(_.href, '_blank')

    // Get activity for comments tab - returns combined events and issues
    getActivityComments(projectId: string, maxInitialItems: number = 150, resolveUser?: (email?: string, username?: string, name?: string, pluginAttribute?: string) => any): Observable<any[]> {
        // Clean projectId - remove 'projects/' prefix if present
        const cleanProjectId = projectId.replace(/^projects\//, '')
        
        const maxPages = Math.ceil(maxInitialItems / 50)
        const pageRequests: Observable<any[]>[] = []
        
        for (let page = 1; page <= maxPages; page++) {
            pageRequests.push(this.#getActivityCommentsPage(cleanProjectId, page, resolveUser))
        }
        return forkJoin(pageRequests).pipe(
            map((pagesResults: any[][]) => pagesResults.flat().slice(0, maxInitialItems))
        )
    }
    

    protected connect = () => new Promise<void>((resolve, reject) => {
        this.get('user')
        .pipe(catchError(() => this.handleError(reject)))
        .subscribe((_:any) => {
            const u = this.toUser(_)
            if (u) {
                this._myUser = u
                resolve()
            } else {
                reject()
            }
        })
    })

    // ************** ITaskPlugin
    protected toTask = (_:any):Task => {
        const t = Task.fromJson({
            id          : '' + _.iid,
            name        : `[#${_.iid}] ${_.title}`,
            user_id     : _.assignee?.id,
            user_name   : _.assignee?.name,
            description : _.description ? _.description                          : '',
            state       : ('state' in _) && _.state.toLowerCase() == 'closed' ? 1: 0,
            href        : _.web_url,
            labels      : _.labels,
            project_url : _['_links'].project + '/',
            project_name: _.references.full,
            orig        : _
        })
        t.var.user = this.getUserFor(_.assignee?.id)
        t.var.compact = (t.state == 1)
        t.httpService = this
        return t
    }    
    protected toGitIssue = (_:Task) => ({
        title: _.name,
    })
    protected toUser = (data:any):User|undefined => {
        if (!data) {
            return undefined
        }
        const u = User.fromJson({
            id: data.id,
            name: data.name,
        })
        u.var.avatar_url = data.avatar_url
        u.var.data = data
        u.httpService = this
        u.avatar = () => u.var.avatar_url
        return u
    }

    #getRepositoryName = () => this._baseUrl.replace(/(https?:\/\/)?([^/]*).*/, '$2')
    #getActivityCommentsPage(_projectId: string, page: number, resolveUser?: (email?: string, username?: string, name?: string, pluginAttribute?: string) => any): Observable<any[]> {
        const events$ = this.aget(`events`, { per_page: 50, page }).pipe(
            map((events: any[]) => {
                if (!events) return []
                return events.filter(e => e.action_name === 'pushed to').map(event => {
                    const ref = event.push_data?.ref || 'branch'
                    const commitCount = event.push_data?.commit_count || 1
                    const authorName = event.author?.name || 'Unknown'
                    const authorEmail = event.author?.email
                    const authorUsername = event.author?.username
                    
                    const resolvedUser = resolveUser?.(authorEmail, authorUsername, authorName, 'X-NEXUS-GIT')
                    
                    let description = ''
                    if (!resolvedUser) {
                        description += `${authorName} `
                    }
                    description += `<n>git</n> <code>${ref}</code> [${commitCount}]`
                    return {
                        text: description,
                        created_at: event.created_at,
                        user: resolvedUser || { name: authorName },
                        user_id: resolvedUser?.id,
                        is_mini: true,
                        _icon: resolvedUser ? (resolvedUser as any)._icon : undefined,
                        var: { source: 'git', ...(resolvedUser ? {} : { nicon: 'git' }) },
                        itemCount: events.length
                    }
                })
            })
        )

        const issues$ = this.aget(`issues`, { 
            state: 'all', 
            per_page: 50, 
            page,
            order_by: 'created_at', 
            sort: 'desc' 
        }).pipe(
            map((issues: any[]) => {
                if (!issues) return []
                return issues.map(issue => {
                    const isClosed = issue.state === 'closed'
                    const stateText = isClosed ? 'closed' : 'open'
                    const authorName = issue.author?.name || 'Unknown'
                    const authorEmail = issue.author?.email
                    const authorUsername = issue.author?.username
                    
                    const resolvedUser = resolveUser?.(authorEmail, authorUsername, authorName, 'X-NEXUS-GIT')
                    
                    let description = ''
                    if (!resolvedUser) {
                        description += `${authorName} `
                    }
                    description += `<n>git</n> <a href="${issue.web_url}" target="_blank" class="text-primary">#${issue.iid}</a> [${stateText}]`
                    return {
                        text: description,
                        created_at: issue.created_at,
                        user: resolvedUser || { name: authorName },
                        user_id: resolvedUser?.id,
                        is_mini: true,
                        _icon: resolvedUser ? (resolvedUser as any)._icon : undefined,
                        var: { source: 'git', ...(resolvedUser ? {} : { nicon: 'git' }) },
                        itemCount: issues.length
                    }
                })
            })
        )

        // Combine both observables and flatten
        return forkJoin([events$, issues$]).pipe(
            map(([events, issues]) => [...events, ...issues])
        )
    }
}