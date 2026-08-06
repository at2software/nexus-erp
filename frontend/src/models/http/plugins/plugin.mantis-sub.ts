import { catchError, forkJoin, map, Observable, of } from 'rxjs';
import { Task } from '@models/task/task.model';
import { PluginLink } from '@models/plugin-link/plugin-link.model';
import { MantisPlugin, MantisUser } from './plugin.mantis';

export class MantisSubPlugin extends MantisPlugin {
    tasks: Task[] = [];

    projectId: string = '';

    myUser = () => (this.baseInstance as MantisPlugin)._myUser;

    getHref = () => this._baseUrl;
    getName = () => this._name;
    getUsers = () => this._users;
    getUserFor = (userId: string) => this._users.find((_) => _.id == userId);
    getLabels = () => this._labels;
    getLabelFor = (name: string) => this._labels.find((_) => _.name == name);

    indexMembers = (): Observable<MantisUser[]> => this.get(`projects/${this.projectId}/users`).pipe(map((data) => (data as { users?: MantisUser[] }).users ?? []));
    indexLabels = () => this.get(`projects/${this.projectId}/versions`);
    indexTasks = (filterId?: string): Observable<Task[]> => {
        let queryParams = `project_id=${this.projectId}`;
        const configuredFilterId = filterId || this.enc?.value?.filterId;
        if (configuredFilterId) {
            queryParams += `&filter_id=${configuredFilterId}`;
        }
        const pageSize = 100;
        return this.fetchAllPages((page) => this.agetBody(`issues?${queryParams}&page_size=${pageSize}&page=${page}`, {}, this.toTask), pageSize);
    };
    indexOpenTasks = (): Observable<Task[]> => this.agetBody(`issues?filter_id=assigned`, {}, this.toTask);
    indexTasksPage = (page: number, pageSize: number): Observable<{ tasks: Task[]; hasMore: boolean }> => {
        const configuredFilterId = this.enc?.value?.filterId;
        let queryParams = `project_id=${this.projectId}`;
        if (configuredFilterId) queryParams += `&filter_id=${configuredFilterId}`;
        return (this.agetBody(`issues?${queryParams}&page_size=${pageSize}&page=${page}`, {}, this.toTask)).pipe(map((tasks) => ({ tasks, hasMore: tasks.length >= pageSize })));
    };
    showProject = () => this.get('projects/' + this.projectId);
    toPluginLink = (id: string) => PluginLink.fromJson({ type: 'mantis', url: this.enc.value.url + 'projects/' + id + '/' });

    protected connectSub = (pluginLink?: PluginLink): Promise<void> =>
        new Promise<void>((resolve, reject) => {
            this.projectId = this._baseUrl.substring(this.enc.value.url.length).replace(/projects\/(\d*).*$/, '$1');
            forkJoin([this.showProject(), this.indexMembers().pipe(catchError(() => of([] as MantisUser[]))), this.indexLabels()])
                .pipe(
                    catchError(() => {
                        reject();
                        return of([]);
                    }),
                )
                .subscribe((data: any) => {
                    this.versions = data[0].projects[0].versions;
                    this._name = data[0].projects[0].name;
                    this.categories = data[0].projects[0].categories;
                    const userList = data[1] as MantisUser[];
                    this._users = userList.length > 0 ? userList.map(this.toUser) : (this.getRootInstance() as MantisPlugin)._users;
                    this._labels = data[2].versions.filter((_: any) => !_.obsolete).map(this.toLabel);
                    if (pluginLink && pluginLink.name != this._name) {
                        pluginLink.update({ name: this._name }).subscribe();
                    }
                    resolve();
                });
        });
}
