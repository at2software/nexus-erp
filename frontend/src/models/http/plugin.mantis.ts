import { catchError, forkJoin, map, Observable, of } from "rxjs";
import { PluginInstance } from "./plugin.instance";
import { ITaskPlugin } from "../tasks/task.plugin.interface";
import { Task } from "../tasks/task.model";
import { Label } from "../tasks/label.model";
import { User } from "../user/user.model";
import { environment } from "src/environments/environment";
import { Color } from "src/constants/Color";
import { PluginLink } from "../pluginLink/plugin-link.model";

export class MantisPlugin extends PluginInstance implements ITaskPlugin {

    ITaskPluginProperty              : boolean
    _myUser                         : User
    _name                           : string
    _users                          : User[] = []
    _labels                         : Label[] = []
    projects                        : any[]
    tasks                           : Task[] = []
    categories                      : { id:number, name:string, project:any, status:string }[]
    versions                        : { description:string, id: number, name:string, obsolete:boolean, released:boolean, timestamp:string }[]

    index: () => Observable<Task[]>

    myUser = () => (this.getRootInstance() as MantisPlugin)._myUser
    baseUrl = () => environment.envApi + 'cors'

    get    = (url: string, params?: any, ...args: any) => super.post('', this.#payload(url, 'get', params), ...args)
    aget   = (url: string, params?: any, ...args: any) => super.post('', this.#payload(url, 'get', params), ...args)
    delete = (url: string, params?: any, ...args: any) => super.post('', this.#payload(url, 'delete', params), ...args)
    put    = (url: string, params?: any, ...args: any) => super.post('', this.#payload(url, 'put', params), ...args)
    post   = (url: string, params?: any, ...args: any) => super.post('', this.#payload(url, 'post', params), ...args)
    patch  = (url: string, params?: any, ...args: any) => super.post('', this.#payload(url, 'patch', params), ...args)

    icon           = () => 'mantis'
    getHref        = () => this._baseUrl
    getName        = () => this._name
    getUsers       = () => this._users
    getUserFor     = (userId: string) => this._users.find(_ => _.id == userId)
    getLabels      = () => this._labels
    getLabelFor    = (name: string) => this._labels.find(_ => _.name == name)
    
    // VCard integration metadata
    getVcardAttributeName = () => 'X-NEXUS-MANTISBT'
    isUserInInstance = (userId: string): boolean => this._users.some(_ => String(_.id) === String(userId))
    getProfileUrl = (userId: string): string => {
        const mantisUrl = this.enc.value.url.replace(/\/$/, '')
        return `${mantisUrl}/manage_user_edit_page.php?user_id=${userId}`
    }
    getUserSelectionModalPath = () => '../../app/_modals/mantis-user-selection/mantis-user-selection.component'
    getInterfacePropertyName = () => 'ITaskPluginProperty'
    getPluginTypeName = () => 'mantisbt'
    indexTasks     = (filterId?: string) => {
        const configuredFilterId = filterId || this.enc?.value?.filterId;
        const filterParam = configuredFilterId ? `filter_id=${configuredFilterId}` : 'filter_id=assigned';
        return this.aget(`issues?${filterParam}`, {}, this.toTask);
    }
    indexMembers   = (): Observable<any> => of({ users: [] })
    indexLabels    = (): Observable<any> => of()
    indexUsers     = () => this.indexMembers()
    showProject    = (): Observable<any> => of()
    toPluginLink   = (id: string) => PluginLink.fromJson({ type: 'mantis', 'url': this.enc.value.url + 'projects/' + id + '/' })

    create      = (_: Task) => this.post('issues', this.toMantisIssue(_))
    close       = (_: Task) => this.patch('index.php/issues/' + _.id, { status: { name: 'resolved' } } )
    reopen      = (_: Task) => this.patch('issues/' + _.id, { status: { name: 'new' } } )
    destroy     = (_: Task) => this.delete('issues/' + _.id)
    assign      = (_: Task) => this.patch(`issues/${_.id}`, { handler: { name: this.myUser().name}, status: { name: 'assigned'} } )
    addLabel    = (_: Task, label: string) => this.patch(`issues/${_.project_id}`, { id:_.id, target_version: this.getLabelFor(label)?.id })
    removeLabel = () => of(Task.fromJson())

    toState = (status: any) => {
        if (!status || !('name' in status)) return 0
        return (status.name == 'resolved' || status.name == 'closed') ? 1 : 0
    }

    toLabel = (_: any) => new Label(Color.uniqueColorFromString('' + _.id), _.name, _.id)

    toTask = (data: any): Task => data.issues.map((_: any) => {
        const t = Task.fromJson({
            id                : '' + _.id,
            name              : `[#${_.id}] ${_.summary}`,
            user_id           : _.handler?.id,
            user_name         : _.handler?.name,
            description       : _.description || '',
            state             : ('status' in _) ? this.toState(_.status) : 0,
            href              : this.enc.value.url + 'view.php?id=' + _.id,
            labels            : _.target_version ? [_.target_version.name] : [],
            orig              : _,
            project_url       : _.project.name,
            project_name      : _.project.name
        })
        t.var.user = this.getUserFor(_.handler?.id)
        t.var.target_version_id = _.target_version?.id
        t.var.compact = (t.state == 1)
        t.httpService = this
        return t
    })

    toMantisIssue = (_: Task) => ({ data: {
        summary     : _.name,
        description : _.name,
        category    : { name: this.categories[0].name },
        status      : { name: 'new' },
        project     : { id: _.project_id }
    }})

    toUser = (data: any) => {
        const u = User.fromJson({ id: data.id, name: data.name })
        u.var.data = data
        u.httpService = this
        u.avatar = () => ''
        return u
    }

    open = (_: Task) => window.open(this.enc.value.url + `view.php?id=${_.id}`, '_blank')

    // Get activity for comments tab
    getActivityComments(projectId: string, maxInitialItems: number = 150, resolveUser?: (email?: string, username?: string, name?: string, pluginAttribute?: string) => any): Observable<any[]> {
        const pageSize = 50
        const maxPages = Math.ceil(maxInitialItems / pageSize)
        const pageRequests: Observable<any[]>[] = []
        
        for (let page = 1; page <= maxPages; page++) {
            pageRequests.push(this.#getActivityCommentsPage(projectId, page, pageSize, resolveUser))
        }
        
        return forkJoin(pageRequests).pipe(
            map((pagesResults: any[][]) => pagesResults.flat().slice(0, maxInitialItems))
        )
    }
    
    protected connect = () => new Promise<void>((resolve, reject) => {
        forkJoin([this.get('users/me'), this.indexUsers()])
        .pipe(catchError(() => { reject(); return of([]) }))
        .subscribe((data: any) => {
            this._name = this._baseUrl.replace(/(https?:\/\/)?([^/]*).*/, '$2')
            this._myUser = this.toUser(data[0])
            this.projects = data[0].projects
            this._users = data[1].users?.map(this.toUser) || []
            resolve()
        })
    })

    #payload = (url: string, method: string, params: any = {}) => Object.assign({
        url: `${this.enc.value.url.replace(/\/$/, '')}/api/rest/${url}`,
        method,
        headers: [
            'Authorization: ' + this.enc.value.token,
            'Content-Type: application/json',
        ]
    }, {data: params })
    
    #getActivityCommentsPage(projectId: string, page: number, pageSize: number, resolveUser?: (email?: string, username?: string, name?: string, pluginAttribute?: string) => any): Observable<any[]> {
        const queryParams = `project_id=${projectId}&page=${page}&page_size=${pageSize}`
        
        return this.aget(`issues?${queryParams}`, {}, (data: any) => data).pipe(
            map((response: any) => {
                const tasks = response?.issues || []
                return tasks.filter((task: any) => task).map((issue: any) => {
                    const isClosed = issue.status?.name === 'resolved' || issue.status?.name === 'closed'
                    const stateText = isClosed ? 'closed' : 'open'
                    const authorName = issue.reporter?.name || 'Unknown'
                    const authorEmail = issue.reporter?.email
                    const authorMantisId = issue.reporter?.id?.toString()
                    const issueId = issue.id
                    const href = this.enc.value.url + 'view.php?id=' + issueId
                    
                    const resolvedUser = resolveUser?.(authorEmail, authorMantisId, authorName, 'X-NEXUS-MANTISBT')
                    
                    let description = ''
                    if (!resolvedUser) {
                        description += `${authorName} `
                    }
                    description += `<n>mantis</n> <a href="${href}" target="_blank" class="text-primary">#${issueId}</a> [${stateText}]`

                    return {
                        text: description,
                        created_at: issue.created_at,
                        user: resolvedUser || { name: authorName },
                        user_id: resolvedUser?.id,
                        is_mini: true,
                        _icon: resolvedUser ? (resolvedUser as any)._icon : undefined,
                        var: { source: 'mantis', ...(resolvedUser ? {} : { nicon: 'mantis' }) },
                        itemCount: tasks.length,
                        pageSize: pageSize
                    }
                })
            })
        )
    }
}