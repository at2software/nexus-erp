import { catchError, forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { PluginInstance } from './plugin.instance';
import { ITaskPlugin } from '../tasks/task.plugin.interface';
import { Task } from '../tasks/task.model';
import { Label } from '../tasks/label.model';
import { User } from '../user/user.model';
import { environment } from 'src/environments/environment';
import { Color } from '@constants/Color';
import { PluginLink } from '../pluginLink/plugin-link.model';
import { Dictionary } from '@constants/constants';
import { Deserializer } from './http.wrapper';

// MantisBT access levels. MANAGER+ may manage a project's members; ADMINISTRATOR is
// required for site-wide actions (create project / create global user).
export const MantisAccess = { VIEWER: 10, REPORTER: 25, UPDATER: 40, DEVELOPER: 55, MANAGER: 70, ADMINISTRATOR: 90 } as const;
type MantisAccessLevel = number | { id?: number; name?: string };

export interface MantisProject extends Dictionary { id: string; name: string; description?: string; enabled?: boolean; access_level?: MantisAccessLevel; }
interface MantisIssue extends Dictionary { id: number; summary: string; description?: string; handler?: { id: number; name: string }; reporter?: { id?: number; name?: string; email?: string }; status?: { name: string }; target_version?: { id: number; name: string }; project: MantisProject; created_at?: string; }
export interface MantisUser extends Dictionary { id: number; name: string; email?: string; access_level?: MantisAccessLevel; projects?: MantisProject[]; }
interface MantisLabel extends Dictionary { id: number; name: string; color?: string; }

export class MantisPlugin extends PluginInstance implements ITaskPlugin {
    ITaskPluginProperty!: boolean;
    _myUser!: User;
    _name: string = '';
    _users: User[] = [];
    _labels: Label[] = [];
    _accessLevel: number = 0;
    projects: MantisProject[] = [];
    tasks: Task[] = [];
    categories: { id: number; name: string; project: MantisProject; status: string }[] = [];
    versions: { description: string; id: number; name: string; obsolete: boolean; released: boolean; timestamp: string }[] = [];

    index!: () => Observable<Task[]>;

    myUser = () => (this.getRootInstance() as MantisPlugin)._myUser;
    baseUrl = () => environment.envApi + 'cors';

    get = <T=unknown>(url: string, params?: Dictionary, ...args: Deserializer[]) => super.post<T>('', this.#payload(url, 'get', params), ...args);
     
    aget = <T = unknown>(url: string, params?: Dictionary, ...args: Deserializer[]): Observable<T[]> => super.post<T[]>('', this.#payload(url, 'get', params), ...args) as unknown as Observable<T[]>;
    delete = <T=unknown>(url: string, params?: Dictionary, ...args: Deserializer[]) => super.post<T>('', this.#payload(url, 'delete', params), ...args);
    put = <T=unknown>(url: string, params?: Dictionary, ...args: Deserializer[]) => super.post<T>('', this.#payload(url, 'put', params), ...args);
    post = <T=unknown>(url: string, params?: Dictionary, ...args: Deserializer[]) => super.post<T>('', this.#payload(url, 'post', params), ...args);
    patch = <T=unknown>(url: string, params?: Dictionary, ...args: Deserializer[]) => super.post<T>('', this.#payload(url, 'patch', params), ...args);

    icon = () => 'mantis';
    getHref = () => this._baseUrl;
    getName = () => this._name;
    getUsers = () => this._users;
    getUserFor = (userId: string) => this._users.find((_) => _.id == userId);
    getLabels = () => this._labels;
    getLabelFor = (name: string) => this._labels.find((_) => _.name == name);

    // Capability detection — gates UI for management actions strictly by what the
    // user's own Mantis token already permits, so nothing escalates privileges.
    #normalizeAccess = (level?: MantisAccessLevel): number => (typeof level === 'number' ? level : (level?.id ?? 0));
    accessLevelFor = (projectId: string): number => {
        const root = this.getRootInstance() as MantisPlugin;
        const project = root.projects.find((_) => String(_.id) === String(projectId));
        return Math.max(this.#normalizeAccess(project?.access_level), root._accessLevel);
    };
    canManageProjectMembers = (projectId: string): boolean => this.accessLevelFor(projectId) >= MantisAccess.MANAGER;
    canAdminister = (): boolean => (this.getRootInstance() as MantisPlugin)._accessLevel >= MantisAccess.ADMINISTRATOR;

    fetchIssue = (issueId: string): Observable<{ href: string; state: number } | undefined> =>
        this.get<{ issues?: MantisIssue[] }>('issues/' + issueId).pipe(
            map((res) => {
                const issue = res?.issues?.[0];
                return issue ? { href: this.enc.value.url + 'view.php?id=' + issueId, state: this.toState(issue.status) } : undefined;
            }),
            catchError(() => of(undefined)),
        );

    // VCard integration metadata
    getVcardAttributeName = () => 'X-NEXUS-MANTISBT';
    isUserInInstance = (userId: string): boolean => this._users.some((_) => String(_.id) === String(userId));
    getProfileUrl = (userId: string): string => {
        const mantisUrl = this.enc.value.url.replace(/\/$/, '');
        return `${mantisUrl}/manage_user_edit_page.php?user_id=${userId}`;
    };
    getUserSelectionModalPath = () => '../../app/_modals/mantis-user-selection/mantis-user-selection.component';
    getInterfacePropertyName = () => 'ITaskPluginProperty';
    getPluginTypeName = () => 'mantisbt';
    indexTasks = (filterId?: string): Observable<Task[]> => {
        const configuredFilterId = filterId || this.enc?.value?.filterId;
        const filterParam = configuredFilterId ? `filter_id=${configuredFilterId}` : 'filter_id=assigned';
        const pageSize = 100;
        return this.fetchAllPages((page) => this.aget(`issues?${filterParam}&page_size=${pageSize}&page=${page}`, {}, this.toTask) as unknown as Observable<Task[]>, pageSize);
    };
    // Mantis's REST API has no generic open/closed query param, so `openOnly` can't be honored server-side here.
    indexTasksPage = (page: number, pageSize: number): Observable<{ tasks: Task[]; hasMore: boolean }> => {
        const configuredFilterId = this.enc?.value?.filterId;
        const filterParam = configuredFilterId ? `filter_id=${configuredFilterId}&` : '';
        return (this.aget(`issues?${filterParam}page_size=${pageSize}&page=${page}`, {}, this.toTask) as unknown as Observable<Task[]>).pipe(map((tasks) => ({ tasks, hasMore: tasks.length >= pageSize })));
    };
    // Mantis's REST API has no free-text search — only a direct id lookup, which still lets a
    // numeric query resolve instantly instead of paging through the whole issue list.
    searchIssues = (query: string): Observable<Task[]> =>
        /^\d+$/.test(query.trim()) ? (this.aget(`issues/${query.trim()}`, {}, this.toTask) as unknown as Observable<Task[]>).pipe(catchError(() => of([]))) : of([]);
    // MantisBT's REST API has no "list all users" endpoint; aggregate users across every project the token can see.
    indexMembers = (): Observable<MantisUser[]> => {
        if (this.projects.length === 0) return of([]);
        return forkJoin(
            this.projects.map((p) =>
                this.get(`projects/${p.id}/users`).pipe(
                    map((data) => (data as { users?: MantisUser[] }).users ?? []),
                    catchError(() => of([] as MantisUser[])),
                ),
            ),
        ).pipe(map((perProject) => Array.from(new Map(perProject.flat().map((u) => [u.id, u])).values())));
    };
    indexLabels = (): Observable<unknown> => of([]);
    // Disabled: querying every project just to list Mantis users is too much request load on startup.
    indexUsers = (): Observable<MantisUser[]> => of([]);
    showProject = (): Observable<unknown> => of();
    toPluginLink = (id: string) => PluginLink.fromJson({ type: 'mantis', name: this.projects.find((_) => String(_.id) === String(id))?.name ?? '', url: this.enc.value.url + 'projects/' + id + '/' });

    create = (_: Task) => this.post('issues', this.toMantisIssue(_));
    close = (_: Task) => this.patch('index.php/issues/' + _.id, { status: { name: 'resolved' } });
    reopen = (_: Task) => this.patch('issues/' + _.id, { status: { name: 'new' } });
    destroy = (_: Task) => this.delete('issues/' + _.id);
    assign = (_: Task) => this.patch(`issues/${_.id}`, { handler: { name: this.myUser().getName() }, status: { name: 'assigned' } });
    addLabel = (_: Task, label: string): Observable<Task> => this.patch(`issues/${_.project_id}`, { id: _.id, target_version: this.getLabelFor(label)?.id }) as unknown as Observable<Task>;
    removeLabel = () => of(Task.fromJson());

    toState = (status: { name: string } | undefined) => {
        if (!status || !('name' in status)) return 0;
        return status.name == 'resolved' || status.name == 'closed' ? 1 : 0;
    };

    toLabel = (_: MantisLabel) => new Label(Color.uniqueColorFromString('' + _.id), _.name, String(_.id));

    toTask = (data: unknown): unknown => {
        const { issues } = data as { issues: MantisIssue[] };
        return issues.map((_: MantisIssue) => {
            const t = Task.fromJson({
                id: '' + _.id,
                name: `[#${_.id}] ${_.summary}`,
                user_id: _.handler?.id,
                user_name: _.handler?.name,
                description: _.description || '',
                state: 'status' in _ ? this.toState(_.status) : 0,
                href: this.enc.value.url + 'view.php?id=' + _.id,
                labels: _.target_version ? [_.target_version.name] : [],
                orig: _,
                // Mirrors PluginLink's own url shape for a Mantis project (see #toPluginLink) so
                // an issue's project can be resolved back to a NEXUS project by exact url match.
                project_url: `${this.enc.value.url}projects/${_.project.id}/`,
                project_name: _.project.name,
            });
            t.var.user = this.getUserFor(String(_.handler?.id ?? ''));
            t.var.target_version_id = _.target_version?.id;
            t.var.compact = t.state == 1;
            t.httpService = this;
            return t;
        });
    };

    toMantisIssue = (_: Task) => ({
        data: {
            summary: _.name,
            description: _.name,
            category: { name: this.categories[0].name },
            status: { name: 'new' },
            project: { id: _.project_id },
        },
    });

    toUser = (data: MantisUser) => {
        const u = User.fromJson({ id: data.id, name: data.name });
        u.var.data = data;
        u.httpService = this;
        u.avatar = () => '';
        return u;
    };

    open = (_: Task) => window.open(this.enc.value.url + `view.php?id=${_.id}`, '_blank');

    // Get activity for comments tab
    getActivityComments(projectId: string, maxInitialItems: number = 150, resolveUser?: (email?: string, username?: string, name?: string, pluginAttribute?: string) => unknown): Observable<Dictionary[]> {
        const pageSize = 50;
        const maxPages = Math.ceil(maxInitialItems / pageSize);
        const pageRequests: Observable<Dictionary[]>[] = [];

        for (let page = 1; page <= maxPages; page++) {
            pageRequests.push(this.#getActivityCommentsPage(projectId, page, pageSize, resolveUser));
        }
        return forkJoin(pageRequests).pipe(map((pagesResults: Dictionary[][]) => pagesResults.flat().slice(0, maxInitialItems)));
    }

    protected connect = () =>
        new Promise<void>((resolve, reject) => {
            this.get('users/me')
                .pipe(
                    map((me) => {
                        const meUser = me as MantisUser;
                        this._name = this._baseUrl.replace(/(https?:\/\/)?([^/]*).*/, '$2');
                        this._myUser = this.toUser(meUser);
                        this._accessLevel = this.#normalizeAccess(meUser.access_level);
                        this.projects = meUser.projects ?? [];
                        return meUser;
                    }),
                    switchMap(() => this.indexUsers()),
                    catchError(() => {
                        reject();
                        return of([] as MantisUser[]);
                    }),
                )
                .subscribe((members) => {
                    this._users = members.map((u) => this.toUser(u));
                    resolve();
                });
        });

    #payload = (url: string, method: string, params: Dictionary = {}) =>
        Object.assign(
            {
                url: `${this.enc.value.url.replace(/\/$/, '')}/api/rest/${url}`,
                method,
                headers: ['Authorization: ' + this.enc.value.token, 'Content-Type: application/json'],
            },
            { data: params },
        );

    #getActivityCommentsPage(projectId: string, page: number, pageSize: number, resolveUser?: (email?: string, username?: string, name?: string, pluginAttribute?: string) => unknown): Observable<Dictionary[]> {
        const queryParams = `project_id=${projectId}&page=${page}&page_size=${pageSize}`;
        return this.aget(`issues?${queryParams}`, {}, (data: unknown) => data).pipe(
            map((response: unknown) => {
                const resp = response as { issues?: MantisIssue[] };
                const tasks = resp?.issues || [];
                return tasks
                    .filter((task) => task)
                    .map((issue) => {
                        const isClosed = issue.status?.name === 'resolved' || issue.status?.name === 'closed';
                        const stateText = isClosed ? 'closed' : 'open';
                        const authorName = issue.reporter?.name || 'Unknown';
                        const authorEmail = issue.reporter?.email;
                        const authorMantisId = issue.reporter?.id?.toString();
                        const issueId = issue.id;
                        const href = this.enc.value.url + 'view.php?id=' + issueId;

                        const resolvedUser = resolveUser?.(authorEmail, authorMantisId, authorName, 'X-NEXUS-MANTISBT') as (Dictionary<unknown> & { id?: string; icon?: string }) | undefined;

                        let description = '';
                        if (!resolvedUser) {
                            description += `${authorName} `;
                        }
                        description += `<n>mantis</n> <a href="${href}" target="_blank" class="text-primary">#${issueId}</a> [${stateText}]`;
                        return {
                            text: description,
                            created_at: issue.created_at,
                            user: resolvedUser || { name: authorName },
                            user_id: resolvedUser?.id,
                            is_mini: true,
                            _icon: resolvedUser?.icon,
                            var: { source: 'mantis', ...(resolvedUser ? {} : { nicon: 'mantis' }) },
                            itemCount: tasks.length,
                            pageSize: pageSize,
                        };
                    });
            }),
        );
    }
}
