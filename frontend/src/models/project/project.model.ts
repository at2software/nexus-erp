import { Milestone } from './../milestones/milestone.model';
import { Dictionary } from './../../constants/constants';
import { Serializable } from "./../serializable"
import moment from 'moment';
import { Company } from './../company/company.model';
import { Assignee } from './../assignee/assignee.model';
import { Focus } from './../focus/focus.model';
import { InvoiceItem } from './../invoice/invoice-item.model';
import { User } from './../user/user.model';
import { ProjectService } from './project.service';
import { NxGlobal } from 'src/app/nx/nx.global';
import { HasInvoiceItems } from 'src/interfaces/hasInvoiceItems.interface';
import { Color } from 'src/constants/Color';
import { IHasFiles } from '../file/has_files.interface';
import { PluginInstanceFactory } from '../http/plugin.instance.factory';
import type { IPlugin } from '../http/plugin.instance';
import type { ITaskPlugin } from '../tasks/task.plugin.interface';
import type { IChatPlugin } from '../http/chat.plugin.interface';
import type { PluginLink } from '../pluginLink/plugin-link.model';
import { environment } from 'src/environments/environment';
import { IHasFoci } from '@models/focus/hasFoci.interface';
import { CompanyContact } from '@models/company/company-contact.model';
import { NxAction } from '@app/nx/nx.actions';
import { ProjectState } from './project-state.model';
import { AutoWrap, AutoWrapArray } from '@constants/autowrap';
import type { File } from '@models/file/file.model';
import { Toast } from '@shards/toast/toast';
import { IHasAssignees } from 'src/interfaces/hasAssignees.interface';
import { Product } from '@models/product/product.model';
import { ConnectionProjects } from '@models/company/connection-projects.model';
import { getProjectActions } from './project.actions';
import { Task } from '@models/tasks/task.model';
import { IHasMarker } from 'src/enums/marker';

export const PROJECT_STATES: Dictionary = {
    Prepared: $localize`:@@i18n.invoice.prepared:prepared`,
    InProgress: $localize`:@@i18n.common.active:active`,
    Finished: $localize`:@@i18n.project.finished:finished`,
    Lost: $localize`:@@i18n.project.lost:lost`,
    Alternate: $localize`:@@i18n.project.ignored:ignored`,
    Internal: $localize`:@@i18n.project.internal:internal project`,
    TimeBased: $localize`:@@i18n.project.timeBasedInvoicing:time based invoicing`
}
export class Project extends Serializable implements HasInvoiceItems, IHasFiles, IHasFoci, IHasAssignees, IHasMarker {

    company_id             : string               = ''
    description            : string               = ''
    gross                  : number               = 0
    hours_invested         : number               = 0
    is_active              : number               = 0
    is_discountable        : number              = 0
    is_internal            : number              = 0
    is_time_based          : number              = 0
    milestones             : Milestone[]          = []
    name                   : string               = ''
    net                    : number               = 0
    net_remaining          : number               = 0
    personalized           : Dictionary           = {}
    project_id             : string               = ''
    project_manager_id    ?: string
    target_wage            : number               = 50
    timeline_chart?        : any[]                = []
    no_invoice_focus       : number = 0
    foci_sum?              : number
    individual_wage?       : number
    po_number?             : string
    product_id?            : string
    quoted_at?             : string
    due_at?                : string
    finished_at?           : string
    remind_at?             : string
    revenue_last_12?       : number
    started_at?            : string
    uninvoiced_hours          ?: number
    oldest_unbilled_focus_at  ?: string
    invoiced_downpayments     ?: number
    work_estimated?        : number
    lead_probability      ?: number
    milestone_state_counts?: { todo: number, in_progress: number, done: number, total: number }
    has_time_budget        : boolean
    quote_descriptions    ?: string[]
    marker: number | null

    // Computed static properties for performance (public for direct access)
    isOverdue    : boolean                      = false
    needsReminder: boolean                      = false
    isRelevant   : boolean                      = false
    deadlineColor: string                       = 'text-dark-grey'
    badge        : undefined | [string, string] = undefined
    progress     : number                       = 0
    colorCss     : string                       = ''

    @AutoWrap('Company') company                       : Company
    @AutoWrap('Assignee') pivot                        : Assignee
    @AutoWrap('ProjectState') state                    : ProjectState
    @AutoWrap('Project') parent_project               ?: Project
    @AutoWrap('Product') product                      ?: Product
    @AutoWrap('User') project_manager                  : User
    @AutoWrapArray('File') files                             : File[]
    @AutoWrapArray('Focus') foci                             : Focus[]
    @AutoWrapArray('Assignee') assignees                     : Assignee[]
    @AutoWrapArray('User') assigned_users                    : User[]
    @AutoWrapArray('CompanyContact') assigned_contacts                    : CompanyContact[]
    @AutoWrapArray('InvoiceItem') invoice_items              : InvoiceItem[]
    @AutoWrapArray('Task') tasks                             : Task[] = []
    @AutoWrapArray('PluginLink') plugin_links                : PluginLink[]
    @AutoWrapArray('Project') companys_active_projects       : Project[]
    @AutoWrapArray('Project') companys_base_projects         : Project[]
    @AutoWrapArray('ConnectionProjects') connection_projects?: ConnectionProjects[]
    @AutoWrapArray('ProjectState') states                    : ProjectState[]

    static API_PATH = (): string => 'projects'
    static WEBSOCKET_KEY = (): string => 'Project'
    SERVICE = ProjectService

    doubleClickAction: number = 0
    actions:NxAction[] = getProjectActions(this)

    serialize = () => {
        this.#computeStaticProperties()
        this.has_time_budget = this.is_time_based === 1
        this.icon = `projects/${this.id}/icon`
    }

    postpone = (duration: number, onSuccess?: () => void, comment?: string) => NxGlobal.service.put(`projects/${this.id}/postpone`, { duration: duration, comment: comment }).subscribe((_) => {
        Toast.info($localize`:@@i18n.project.reminderExtended:reminder extended`)
        this.remind_at = _.remind_at
        this.#computeStaticProperties()
        onSuccess?.()
    })
    setState = (data: Dictionary) => NxGlobal.service.put(`projects/${this.id}`, data).subscribe(_ => {
        Object.assign(this, _)
        this.#computeStaticProperties()
    })
    addParticipant = (connectionId: string) => NxGlobal.service.post(`projects/${this.id}/connection-projects`, { connection_id: connectionId }).subscribe((_) => {
        this.connection_projects = this.connection_projects || []
        this.connection_projects.push(ConnectionProjects.fromJson(_))
        Toast.info($localize`:@@i18n.project.participantAdded:participant added`)
        this.show().subscribe()
    })
    snapshotNonPrimitives = ():string[] => ['remind_at', 'due_at']

    time_started = (): moment.Moment => moment(this.started_at)
    time_finished = (): moment.Moment => moment(this.finished_at)
    time_due = (): moment.Moment => moment(this.due_at)
    time_remind = (): moment.Moment => moment(this.remind_at)
    frontendUrl = (): string => `/projects/${this.id}`
    
    #computeStaticProperties() {
        // Cache computed values to avoid repeated calculations
        this.isOverdue      = (this.state?.isRunning() && !this.is_time_based && !this.is_internal && this.due_at) ? this.time_due().isBefore(moment()) : false
        this.needsReminder  = this.#computeNeedsReminder()
        this.progress       = this.#computeProgress()
        this.deadlineColor  = this.#computeDeadlineColor()
        this.colorCss       = this.state?.color || ''
        this.badge          = this.#computeBadge()
        this.isRelevant     = this.#computeIsRelevant()
        this.ngLink = '/projects/' + this.id
    }

    #computeNeedsReminder(): boolean {
        if (!this.remind_at) return false
        if (this.state?.progress == ProjectState.ProgressRunning && !this.is_time_based && !this.is_internal) return this.time_remind().isBefore(moment())
        if (this.state?.progress == ProjectState.ProgressPrepared && !this.is_internal) return this.time_remind().isBefore(moment())
        return false
    }

    #computeProgress(): number {
        if (this.is_time_based) return 1
        if (this.net === 0) return 1
        return (this.work_estimated && this.work_estimated > 0) ? this.hours_invested / this.work_estimated : 0
    }

    #computeDeadlineColor(): string {
        if (!this.due_at) return 'text-dark-grey'
        if (this.time_due().isBefore(moment())) return 'text-danger'
        return 'text-orange'
    }

    #computeBadge(): undefined | [string, string] {
        if (this.needsReminder) return ['bg-danger', $localize`:@@i18n.common.needsAttention:needs attention`]
        if (!this.remind_at && !this.is_internal && !this.is_time_based) return ['bg-warning', $localize`:@@i18n.common.noReminderSet:no reminder set`]
        return undefined
    }

    #computeIsRelevant(): boolean {
        if (this.isOverdue) return true
        if (this.needsReminder) return true
        if (NxGlobal.global.user?.hasRole('financial') && this.net == 0) return false
        if (this.progress > .8) return true
        return false
    }

    rootMilestones = () => this.milestones.filter(_ => _.children.length === 0)


    color                      = (): string => Color.fromHsl((170 + parseInt(this.id) * 29) % 360, 75, 45).toHexString()
    getAcceptedChildren        = (): typeof Serializable[] => [Project, InvoiceItem, Focus]
    getCompanyId               = () => this.company_id
    getExtState                = (): string => this.state?.name || ''
    getForecastSum             = () => this.assignees.reduce((a, b) => a + parseFloat('' + b.hours_planned), 0)
    getRemainingTime           = () => (this.work_estimated ?? 0) - this.hours_invested
    timePercentage             = () => this.hours_invested / (this.work_estimated ?? 1)
    worksharesTotal            = () => (this.var.workshares as any[] ?? []).reduce((a: number, b: any) => a + b.val, 0)
    worksharePerc              = (u: any) => 100 * u.val / this.worksharesTotal()
    getName                    = () => this.name
    getAssignedUsers           = ():Assignee[] => this.assignees.filter(_ => _.assignee instanceof User)
    getAssignedCompanyContacts = ():Assignee[] => this.assignees.filter(_ => _.assignee instanceof CompanyContact)
    hasIndividualWage          = () => this.individual_wage !== null
    getDeadlineColor           = () => this.deadlineColor
    setParent = (_: Serializable): any => {
        if (_ instanceof Company) return this.update({ company_id: _.id, project_id: null }).subscribe()
        if (_ instanceof Project) this.update({ project_id: _.id, company_id: _.company_id }).subscribe()
        console.error('setting parent class ' + _.class + ' is not implemented yet')
    }

    // Plugins
    getInstances = () => PluginInstanceFactory.getInstances<IPlugin>(this.plugin_links, "IPlugin")
    getTaskInstances = () => PluginInstanceFactory.getInstances<ITaskPlugin>(this.plugin_links, "ITaskPlugin")
    getChatInstances = () => PluginInstanceFactory.getInstances<IChatPlugin>(this.plugin_links, "IChatPlugin")

    static iconForId = (id:string) => environment.envApi + `projects/${id}/icon`
}
