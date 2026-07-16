import { Observable } from 'rxjs';
import { IPlugin } from '../http/plugin.instance';
import { Task } from './task.model';
import { User } from '../user/user.model';
import { Label } from './label.model';

export abstract class ITaskPlugin extends IPlugin {
    ITaskPluginProperty!: boolean;
    tasks: Task[] = [];

    myUser!: () => User | undefined;

    indexTasks!: (filterId?: string) => Observable<Task[]>;

    // Paged issue browsing for pickers (avoids eagerly loading an entire project's history).
    // `openOnly` is honored server-side where the tracker's API supports it (e.g. GitLab's
    // `state` param); trackers without such a filter (Mantis) just return their next page as-is.
    // `assignedOnly` defaults to true for pickers (browsing "my issues"); bulk import flows pass
    // false to see every open issue in the project, not just the current user's.
    indexTasksPage!: (page: number, pageSize: number, openOnly: boolean, assignedOnly?: boolean) => Observable<{ tasks: Task[]; hasMore: boolean }>;

    getUsers!: () => User[];
    getUserFor!: (userId: string) => User | undefined;
    getLabels!: () => Label[];
    getLabelFor!: (name: string) => Label | undefined;

    create!: (_: Task) => Observable<any>;
    close!: (_: Task) => Observable<any>;
    reopen!: (_: Task) => Observable<any>;
    destroy!: (_: Task) => Observable<any>;
    assign!: (task: Task, user: User) => Observable<any>;
    addLabel!: (task: Task, _: string) => Observable<Task>;
    removeLabel!: (task: Task, _: string) => Observable<Task>;

    open!: (task: Task) => void;

    // Capability detection — gates management UI strictly by what the user's own token
    // already permits (no privilege escalation). Each tracker maps its own access model.
    canManageProjectMembers!: (projectId: string) => boolean; // add/remove a project's members
    canAdminister!: () => boolean; // site-level admin (create project / global user)

    // Live external-issue lookup. Returns the issue's link + open/closed state (0 = open,
    // 1 = closed/resolved). Status is fetched through the user's own credentials, never stored.
    fetchIssue!: (issueId: string) => Observable<{ href: string; state: number } | undefined>;

    // Server-side issue search for pickers, bypassing pagination. Optional: trackers whose API
    // has no free-text search (e.g. Mantis) omit this; the picker falls back to filtering
    // already-loaded pages, except for a numeric query which Mantis can still resolve by id.
    searchIssues?: (query: string) => Observable<Task[]>;
}
