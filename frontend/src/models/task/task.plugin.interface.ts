import { Observable } from 'rxjs';
import { IPlugin } from '../http/plugins/plugin.instance';
import { Task } from './task.model';
import { User } from '../user/user.model';
import { Label } from './label.model';
import { Assignee } from '../assignee/assignee.model';

export abstract class ITaskPlugin extends IPlugin {
    ITaskPluginProperty!: boolean;
    tasks: Task[] = [];

    myUser!: () => User | undefined;

    indexTasks!: (filterId?: string) => Observable<Task[]>;

    indexTasksPage!: (page: number, pageSize: number, openOnly: boolean, assignedOnly?: boolean) => Observable<{ tasks: Task[]; hasMore: boolean }>;

    getUsers!: () => User[];
    getUserFor!: (userId: string) => User | undefined;
    getLabels!: () => Label[];
    getLabelFor!: (name: string) => Label | undefined;

    create!: (_: Task) => Observable<unknown>;
    close!: (_: Task) => Observable<unknown>;
    reopen!: (_: Task) => Observable<unknown>;
    destroy!: (_: Task) => Observable<unknown>;
    assign!: (task: Task, user: User) => Observable<unknown>;
    addLabel!: (task: Task, _: string) => Observable<Task>;
    removeLabel!: (task: Task, _: string) => Observable<Task>;

    open!: (task: Task) => void;

    canManageProjectMembers!: (projectId: string) => boolean; // add/remove a project's members
    canAdminister!: () => boolean; // site-level admin (create project / global user)

    fetchIssue!: (issueId: string) => Observable<{ href: string; state: number } | undefined>;

    searchIssues?: (query: string) => Observable<Task[]>;

    addCoAssignee?: (task: Task, user: User) => Observable<Assignee>;
    removeCoAssignee?: (task: Task, assignmentId: string) => Observable<unknown>;
}
