import { Serializable } from '../serializable';
import { NexusHttpService } from '@models/http/http.nexus';
import { getMilestoneActions } from './milestone.actions';
import { InvoiceItem } from '../invoice/invoice-item.model';
import { MilestoneState, getMilestoneStateInfo } from './milestone-state.enum';
import { User } from '../user/user.model';
import { Task } from '../tasks/task.model';
import { NxGlobal } from '@app/nx/nx.global';
import { Project } from '../project/project.model';
import moment from 'moment';
import { Type } from 'class-transformer';
import { Model } from '@constants/type-discriminators';
import { computed } from '@angular/core';

@Model('Milestone')
export class Milestone extends Serializable {
    static API_PATH = (): string => 'milestones';
    SERVICE = NexusHttpService<any>;

    doubleClickAction: number = 0;
    actions = getMilestoneActions(this);

    due_at: string | null = null;
    started_at: string | null = null;
    duration: number = 1;
    progress: number = 0;
    name: string = '';
    state: MilestoneState = MilestoneState.TODO;
    user_id: string | null = null;
    project_id: string | null = null;
    workload_hours: number | null = null;
    computed_workload_percent: number | null = null;
    comments: string = '';

    @Type(()=>User) user?: User;
    @Type(()=>Project) project?: Project;
    @Type(()=>Milestone) children: Milestone[] = [];
    @Type(()=>Milestone) dependants: Milestone[] = [];
    @Type(()=>Milestone) dependees: Milestone[] = [];
    @Type(()=>Task) tasks: Task[] = [];
    @Type(()=>InvoiceItem) invoice_items: InvoiceItem[] = [];

    setState = (state: MilestoneState) => this.update({ state: state });
    assignTo = (userId: string | null) => this.update({ user_id: userId });

    getAssignmentActions() {
        // Get project from NxGlobal currentRoot
        const currentRoot = NxGlobal.context?.ofClassOrUndefined(Milestone);
        if (!currentRoot?.project?.assignedUsers().length) {
            return [];
        }
        const project = currentRoot?.project;

        // Get users from assignees - they're wrapped in Assignee objects
        const assignedUsers = project.assignedUsers();
        const projectUsers = assignedUsers.map((assignee) => assignee.assignee as User);
        const actions = [];

        // Add unassign option if user is assigned
        if (this.user_id !== null) {
            actions.push({
                title: $localize`:@@i18n.milestone.unassign:unassign`,
                group: true,
                action: () => this.assignTo(null),
            });
        }

        // Add assign options for each project user
        projectUsers.forEach((user: User) => {
            actions.push({
                title: user.getName(),
                group: true,
                action: () => this.assignTo(user.id),
            });
        });
        return actions;
    }

    get scss() {
        return getMilestoneStateInfo(this.state).bgClass;
    }

    isCurrentUserAssigned = (): boolean => this.user_id === NxGlobal.global.user?.id;
    time_started = (): moment.Moment => moment(this.started_at);
    time_due = (): moment.Moment => moment(this.due_at);

    startDate = computed(() => { const s = this.snapshot().started_at; return s ? new Date(s) : null; });
    endDate = computed((): Date | null => {
        const due = this.snapshot().due_at;
        if (!due) return null;
        const d = new Date(due);
        d.setHours(23, 59, 59, 999);
        return d;
    });
    isDuePast = (): boolean => (this.due_at ? moment().isAfter(this.due_at) : false);
    getStateInfo() {
        return getMilestoneStateInfo(this.state);
    }
}
