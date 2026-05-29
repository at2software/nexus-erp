import { Milestone } from './../milestones/milestone.model';
import { Dictionary } from './../../constants/constants';
import { Serializable } from './../serializable';
import moment from 'moment';
import { Company } from './../company/company.model';
import { Assignee } from './../assignee/assignee.model';
import { Focus } from './../focus/focus.model';
import { InvoiceItem } from './../invoice/invoice-item.model';
import { User } from './../user/user.model';
import { ProjectService } from './project.service';
import { NxGlobal } from '@app/nx/nx.global';
import { HasInvoiceItems } from '@interfaces/hasInvoiceItems.interface';
import { Color } from '@constants/Color';
import { IHasFiles } from '../file/has_files.interface';
import { PluginInstanceFactory } from '../http/plugin.instance.factory';
import type { IPlugin } from '../http/plugin.instance';
import type { ITaskPlugin } from '../tasks/task.plugin.interface';
import type { IChatPlugin } from '../http/chat.plugin.interface';
import { PluginLink } from '../pluginLink/plugin-link.model';
import { environment } from 'src/environments/environment';
import { IHasFoci } from '@models/focus/hasFoci.interface';
import { CompanyContact } from '@models/company/company-contact.model';
import { NxAction } from '@app/nx/nx.actions';
import { ProjectState } from './project-state.model';
import { Type } from 'class-transformer';
import { File } from '@models/file/file.model';
import { Toast } from '@shards/toast/toast';
import { IHasAssignees } from '@interfaces/hasAssignees.interface';
import { Product } from '@models/product/product.model';
import { ConnectionProjects } from '@models/company/connection-projects.model';
import { getProjectActions } from './project.actions';
import { Task } from '@models/tasks/task.model';
import { IHasMarker } from '@enums/marker';
import { Subject } from 'rxjs';
import { Model } from '@constants/type-discriminators';
import { computed } from '@angular/core';

export const PROJECT_STATES: Dictionary = {
    Prepared: $localize`:@@i18n.invoice.prepared:prepared`,
    InProgress: $localize`:@@i18n.common.active:active`,
    Finished: $localize`:@@i18n.project.finished:finished`,
    Lost: $localize`:@@i18n.project.lost:lost`,
    Alternate: $localize`:@@i18n.project.ignored:ignored`,
    Internal: $localize`:@@i18n.project.internal:internal project`,
    TimeBased: $localize`:@@i18n.project.timeBasedInvoicing:time based invoicing`,
};
@Model('Project')
export class Project extends Serializable implements HasInvoiceItems, IHasFiles, IHasFoci, IHasAssignees, IHasMarker {
    company_id: string = '';
    description: string = '';
    gross: number = 0;
    hours_invested: number = 0;
    is_active: number = 0;
    is_discountable: number = 0;
    is_internal: number = 0;
    is_time_based: number = 0;
    milestones: Milestone[] = [];
    name: string = '';
    net: number = 0;
    net_remaining: number = 0;
    personalized: Dictionary = {};
    project_id: string = '';
    project_manager_id?: string;
    target_wage: number = 50;
    timeline_chart?: any[] = [];
    no_invoice_focus: number = 0;
    no_git_required: number = 0;
    foci_sum?: number;
    individual_wage?: number;
    po_number?: string;
    product_id?: string;
    quoted_at?: string;
    due_at?: string;
    finished_at?: string;
    remind_at?: string;
    revenue_last_12?: number;
    started_at?: string;
    uninvoiced_hours?: number;
    oldest_unbilled_focus_at?: string;
    invoiced_downpayments?: number;
    work_estimated?: number;
    lead_probability?: number;
    milestone_state_counts?: { todo: number; in_progress: number; done: number; total: number };
    quote_descriptions?: string[];
    marker: number | null = null;

    isOverdue               = computed(() => { const j = this.snapshot(); return j.state?.progress === ProjectState.ProgressRunning && !j.is_time_based && !j.is_internal && j.due_at ? moment(j.due_at).isBefore(moment()) : false; });
    needsReminder           = computed(() => this.#calcNeedsReminder());
    isRelevant              = computed(() => this.isOverdue() || this.needsReminder() || (NxGlobal.global.user?.hasRole('financial') ? this.net !== 0 : false) || this.progress() > 0.8);
    deadlineColor           = computed(() => { const s = this.snapshot(); return !s.due_at ? 'text-dark-grey' : moment(s.due_at).isBefore(moment()) ? 'text-danger' : 'text-orange'; });
    progress                = computed(() => this.is_time_based ? 1 : this.net === 0 ? 1 : (this.work_estimated && this.work_estimated > 0 ? this.hours_invested / this.work_estimated : 0));
    css                     = computed(() => this.snapshot().state?.color || '');
    rootMilestones          = computed(() => this.milestones.filter((_) => _.children.length === 0));
    color                   = computed((): string => Color.fromHsl((170 + parseInt(this.id) * 29) % 360, 75, 45).toHexString());
    acceptedChildren        = computed((): (typeof Serializable)[] => [Project, InvoiceItem, Focus]);
    companyId               = computed(() => this.company_id);
    getExtState             = computed((): string => this.state?.name || '');
    remainingAllocatedTime  = computed(() => this.assignees.reduce((a, b) => a + parseFloat('' + b.hours_planned), 0));
    remainingTimeBudget     = computed(() => (this.work_estimated ?? 0) - this.hours_invested);
    timePercentage          = computed(() => this.hours_invested / (this.work_estimated ?? 1));
    worksharesTotal         = computed(() => ((this.var.workshares as any[]) ?? []).reduce((a: number, b: any) => a + b.val, 0));
    getName                 = computed(() => this.name);
    assignedUsers           = computed((): Assignee[] => this.assignees.filter((_) => _.assignee instanceof User));
    assignedCompanyContacts = computed((): Assignee[] => this.assignees.filter((_) => _.assignee instanceof CompanyContact));
    hasIndividualWage       = computed(() => this.individual_wage !== null);
    pluginInstances         = computed(() => PluginInstanceFactory.getInstances<IPlugin>(this.plugin_links, 'IPlugin'));
    taskPluginInstances     = computed(() => PluginInstanceFactory.getInstances<ITaskPlugin>(this.plugin_links, 'ITaskPlugin'));
    chatPluginInstances     = computed(() => PluginInstanceFactory.getInstances<IChatPlugin>(this.plugin_links, 'IChatPlugin'));
    hasTimeBudget           = computed((): boolean => this.is_time_based === 1);
    momentStarted           = computed((): moment.Moment => moment(this.started_at));
    momentFinished          = computed((): moment.Moment => moment(this.finished_at));
    momentDue               = computed((): moment.Moment => moment(this.due_at));
    momentRemind            = computed((): moment.Moment => moment(this.remind_at));
    frontendUrl             = computed((): string => `/projects/${this.id}`);

    override readonly badge = computed(() => this.#calcBadge());
    protected override readonly computedIcon = computed(() => environment.envApi + `projects/${this.id}/icon`);
    override readonly ngLink = computed(() => `/projects/${this.id}`);
    projectManagerChanged = new Subject<void>();

    @Type(()=>Company) company!: Company;
    @Type(()=>Assignee) pivot!: Assignee;
    @Type(()=>ProjectState) state!: ProjectState;
    @Type(()=>Project) parent_project?: Project;
    @Type(()=>Product) product?: Product;
    @Type(()=>User) project_manager!: User;
    @Type(()=>File) files!: File[];
    @Type(()=>Focus) foci!: Focus[];
    @Type(()=>Assignee) assignees!: Assignee[];
    @Type(()=>User) assigned_users!: User[];
    @Type(()=>CompanyContact) assigned_contacts!: CompanyContact[];
    @Type(()=>InvoiceItem) invoice_items!: InvoiceItem[];
    @Type(()=>Task) tasks: Task[] = [];
    @Type(()=>PluginLink) plugin_links!: PluginLink[];
    @Type(()=>Project) companys_active_projects!: Project[];
    @Type(()=>Project) companys_base_projects!: Project[];
    @Type(()=>ConnectionProjects) connection_projects?: ConnectionProjects[];
    @Type(()=>ProjectState) states!: ProjectState[];

    static API_PATH = (): string => 'projects';
    static WEBSOCKET_KEY = (): string => 'Project';
    SERVICE = ProjectService;

    doubleClickAction: number = 0;
    actions: NxAction[] = getProjectActions(this);

    postpone (duration: number, onSuccess?: () => void, comment?: string) {
        NxGlobal.service.put(`projects/${this.id}/postpone`, { duration: duration, comment: comment }).subscribe((_) => {
            Toast.info($localize`:@@i18n.project.reminderExtended:reminder extended`);
            this.patch(_)
            onSuccess?.();
        });
    }

    setState = (data: Dictionary) => NxGlobal.service.put(`projects/${this.id}`, data).subscribe((_) => this.patch(_));
    addParticipant = (connectionId: string) =>
        NxGlobal.service.post(`projects/${this.id}/connection-projects`, { connection_id: connectionId }).subscribe((_) => {
            this.connection_projects = this.connection_projects || [];
            this.connection_projects.push(ConnectionProjects.fromJson(_));
            Toast.info($localize`:@@i18n.project.participantAdded:participant added`);
            this.refresh().subscribe();
        });

    #calcNeedsReminder(): boolean {
        const j = this.snapshot();
        if (!j.remind_at) return false;
        const isPast = moment(j.remind_at).isBefore(moment());
        if (j.state?.progress === ProjectState.ProgressRunning && !j.is_time_based && !j.is_internal) return isPast;
        if (j.state?.progress === ProjectState.ProgressPrepared && !j.is_internal) return isPast;
        return false;
    }

    #calcBadge(): undefined | [string, string] {
        if (this.needsReminder()) return ['bg-danger', $localize`:@@i18n.common.needsAttention:needs attention`];
        if (!this.remind_at && !this.is_internal && !this.is_time_based) return ['bg-warning', $localize`:@@i18n.common.noReminderSet:no reminder set`];
        return undefined;
    }

    worksharePerc = (u: any) => (100 * u.val) / this.worksharesTotal();
    setParent = (_: Serializable): any => {
        if (_ instanceof Company) return this.update({ company_id: _.id, project_id: null }).subscribe();
        if (_ instanceof Project) this.update({ project_id: _.id, company_id: _.company_id }).subscribe();
        console.error('setting parent class ' + _.class + ' is not implemented yet');
    };

    static iconForId = (id: string) => environment.envApi + `projects/${id}/icon`;
}
