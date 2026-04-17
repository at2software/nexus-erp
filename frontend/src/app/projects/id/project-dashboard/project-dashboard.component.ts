import { Component, inject, OnInit } from '@angular/core';
import { ProjectService } from '@models/project/project.service';
import { AssignmentService } from '@models/assignee/assignment.service';
import { GlobalService } from '@models/global.service';
import { ToastService } from '@shards/toast/toast.service';
import moment from 'moment';
import { short } from '@constants/short';
import { Project } from '@models/project/project.model';
import { Assignee } from '@models/assignee/assignee.model';
import { CompanyContact } from '@models/company/company-contact.model';
import { Focus } from '@models/focus/focus.model';
import { User } from '@models/user/user.model';
import { NgbDate, NgbDateAdapter, NgbDatepickerModule, NgbDropdownModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { NgbDateCarbonAdapter } from '@directives/ngb-date.adapter';
import { Color } from '@constants/Color';
import { Dictionary } from '@constants/constants';
import { ProjectDetailGuard } from '@app/projects/project-details.guard';
import { InvoiceItem } from '@models/invoice/invoice-item.model';
import { InvoiceItemType } from '../../../../enums/invoice-item.type';
import { PluginInstanceFactory } from '@models/http/plugin.instance.factory';
import { PluginInstance } from '@models/http/plugin.instance';
import { PluginLinkService } from '@models/pluginLink/plugin-link.service';
import { InputModalService } from '@app/_modals/modal-input/modal-input.component';
import { MantisPlugin } from '@models/http/plugin.mantis';
import { ModalBaseService } from '@app/_modals/modal-base-service';
import { MantisProjectSelectionComponent } from '@app/_modals/mantis-project-selection/mantis-project-selection.component';
import { Encryption } from '@models/encryption/encryption.model';
import { Toast } from '@shards/toast/toast';
import { GitLabPlugin } from '@models/http/plugin.gitlab';
import { MattermostPlugin } from '@models/http/plugin.mattermost';
import { CommonModule } from '@angular/common';
import { PermissionsDirective } from '@directives/permissions.directive';
import { CollapsibleDirective } from '@directives/collapsible.directive';
import { ListGroupItemContactComponent } from '@app/customers/_shards/list-group-item-contact/list-group-item-contact.component';
import { ProjectDefaultProductComponent } from '@app/projects/_shards/project-default-product/project-default-product.component';
import { ProjectPlanningComponent } from '@app/projects/id/project-planning/project-planning.component';
import { RteComponent } from '@shards/rte/rte.component';
import { ProjectInfoComponent } from '@app/projects/_shards/project-info/project-info.component';
import { ProjectTeamPlanningComponent } from '@app/projects/_shards/project-team-planning/project-team-planning.component';
import { FormsModule } from '@angular/forms';
import { AutosaveDirective } from '@directives/autosave.directive';
import { SafePipe } from '../../../../pipes/safe.pipe';
import { AvatarComponent } from "@shards/avatar/avatar.component";
import { NexusModule } from '@app/nx/nexus.module';
import { MediaPreviewComponent } from '../project-media/media-preview/media-preview.component';
import { ProjectUptimeCardComponent } from '@app/projects/_shards/project-uptime-card/project-uptime-card.component';
import { NgxEchartsDirective } from 'ngx-echarts';
import { SearchInputComponent } from '@app/_shards/search-input/search-input.component';
import { ECHARTS_DEFAULT_TOOLTIP_OPTIONS } from '@charts/ChartOptions';

@Component({
    selector: 'project-dashboard',
    templateUrl: './project-dashboard.component.html',
    styleUrls: ['./project-dashboard.component.scss'],
    providers: [{ provide: NgbDateAdapter, useClass: NgbDateCarbonAdapter }],
    standalone: true,
    imports: [
    CommonModule,
    PermissionsDirective,
    CollapsibleDirective,
    ListGroupItemContactComponent,
    NexusModule,
    NgbTooltipModule,
    ProjectDefaultProductComponent,
    ProjectPlanningComponent,
    RteComponent,
    NgxEchartsDirective,
    MediaPreviewComponent,
    ProjectInfoComponent,
    ProjectTeamPlanningComponent,
    NgbDatepickerModule,
    FormsModule,
    AutosaveDirective,
    NgbDropdownModule,
    SafePipe,
    AvatarComponent,
    ProjectUptimeCardComponent,
    SearchInputComponent
]
})
export class ProjectDashboardComponent implements OnInit {

    public chartOptions: any = null
    public chartHeight: number = 300
    public timelineUsers: User[] = []

    assignees: Assignee[] = []
    contacts: Assignee[] = []
    workSharesTotal = () => this.parent.current.var.workShares.reduce((a: number, b: any) => a + b.val, 0)
    workSharesPerc = (u: any) => 100 * u.val / this.workSharesTotal()
    name: string
    description: string
    focusItems: InvoiceItem[] = []
    parentProjectQuery = ''

    global = inject(GlobalService)
    projectService = inject(ProjectService)

    dataActivity: any[] = [
        { name: '', innerSize: 70, size: 80, data: [{ y: 50, name: 'assigned', color: Color.fromVar('orange').toString() }, { y: 50, name: 'unassigned', color: Color.fromVar('bg2').toString() }] },
        { name: '', innerSize: 90, size: 100, data: [{ y: 20, name: 'uncritical', color: Color.fromVar('yellow').toString() }, { y: 80, name: 'critical', color: Color.fromVar('bg2').toString() }] },
        { name: '', innerSize: 110, size: 120, data: [{ y: 80, name: 'completed', color: Color.fromVar('green').toString() }, { y: 20, name: 'unfinished', color: Color.fromVar('bg2').toString() }] },
    ]
    dataBar: any[] = []
    dataBarMax: number = 1

    #assignmentService = inject(AssignmentService)
    #projectService = inject(ProjectService)
    #global = inject(GlobalService)
    parent = inject(ProjectDetailGuard)
    toast = inject(ToastService)
    factory = inject(PluginInstanceFactory)
    pluginLinkService = inject(PluginLinkService)
    inputModalService = inject(InputModalService)
    modalService = inject(ModalBaseService)

    ngOnInit(): void {
        this.parent.onChange.subscribe(() => {
            this.#loadFocusItems()
            this.setWorkload(this.parent.current)
            this.parseAssignments()
            this.parentProjectQuery = this.parent.current?.parent_project?.name ?? ''
        })

        // Initialize focusItems if project data is already available
        if (this.parent.current) {
            this.#loadFocusItems()
            this.setWorkload(this.parent.current)
            this.parseAssignments()
            this.parentProjectQuery = this.parent.current.parent_project?.name ?? ''
        }
    }

    #loadFocusItems(): void {
        if (this.parent.current && this.parent.current.invoice_items && Array.isArray(this.parent.current.invoice_items)) {
            this.parent.current.invoice_items.forEach(item => {
                item.milestones.forEach(milestone => milestone.project = this.parent.current);
            })
            this.focusItems = this.parent.current.invoice_items
                .filter(_ => _ && _.type === InvoiceItemType.Default)
                .sort(this.#sortFocusItems)
        } else {
            console.warn('Invoice items not available, attempting to reload project data')
            this.focusItems = []
            if (this.parent.current && !this.parent.current.invoice_items) {
                setTimeout(() => {
                    this.parent.reload()
                }, 100)
            }
        }
    }

    #sortFocusItems = (a: InvoiceItem, b: InvoiceItem): number => {
        const getCategory = (item: InvoiceItem): number => {
            if (!item.milestones || item.milestones.length === 0) return 1 // No milestones
            if (item.milestones.some(m => m.state === 0 || m.state === 1)) return 2 // Has TODO or IN_PROGRESS
            if (item.milestones.some(m => !m.user_id)) return 3 // Has unassigned
            if (item.milestones.every(m => m.state === 2)) return 4 // All DONE
            return 5 // Other
        }

        const catA = getCategory(a)
        const catB = getCategory(b)

        if (catA !== catB) return catA - catB

        // Within same category, sort by progress descending
        return (b.progress ?? 0) - (a.progress ?? 0)
    }

    net = () => { return short(this.parent.current.net) }
    updateDate = (field:string, date:NgbDate) => {
        const d = `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`
        this.parent.current.update({ [field]: d }).subscribe()
    }



    /**
     * Get color for heatmap cell based on capacity percentage
     * @param percentage Capacity percentage (0-inf)
     * @returns Color string for the cell
     */
    getHeatmapColor = (percentage: number): string => {
        const primaryColor = Color.fromVar('primary')
        const dangerColor = Color.fromVar('danger')
        
        if (percentage <= 100) {
            const rgb = primaryColor.toRgb()
            return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${percentage / 100})`
        }
        
        if (percentage <= 150) {
            const ratio = (percentage - 100) / 50
            const primary = primaryColor.toRgb()
            const danger = dangerColor.toRgb()
            const r = Math.round(primary.r + (danger.r - primary.r) * ratio)
            const g = Math.round(primary.g + (danger.g - primary.g) * ratio)
            const b = Math.round(primary.b + (danger.b - primary.b) * ratio)
            return `rgb(${r}, ${g}, ${b})`
        }
        return dangerColor.toHexString()
    }

    /**
     * Get the number of working days for a given interval cluster type
     * @param cluster Cluster type (year/month/week/day)
     * @returns Number of working days in this period
     */
    getWorkingDaysForInterval = (cluster: string): number => {
        const days: Record<string, number> = { year: 260, month: 21.67, week: 5, day: 1 }
        return days[cluster] || 1
    }

    setWorkload = (project: Project) => {
        // Initialize var object
        project.var = { workshares: [] } as any

        // Fill missing cluster points for all users
        const allClusters: Dictionary = {}
        project.timeline_chart?.forEach(userData => {
            userData.data.forEach((_: any) => {
                allClusters[_.month] = true
            })
        })
        const clusters = Object.keys(allClusters).sort()
        
        // Detect cluster interval from gap between consecutive dates
        const daysBetween = clusters.length >= 2 ? moment(clusters[1]).diff(moment(clusters[0]), 'days') : 0
        const clusterType = daysBetween >= 300 ? 'year' : daysBetween >= 20 ? 'month' : daysBetween >= 5 ? 'week' : 'day'
        const workingDaysPerCluster = this.getWorkingDaysForInterval(clusterType)
        project.timeline_chart?.forEach(userData => {
            clusters.forEach(c => {
                if (!userData.data.find((_: any) => _.month === c)) {
                    userData.data.push({ month: c, sum: 0 })
                }
            })
            userData.data.sort((a: any, b: any) => a.month.localeCompare(b.month))
        })

        const validTimeline = project.timeline_chart || []
        if (!validTimeline.length || !clusters.length) {
            this.chartOptions = null
            this.chartHeight = 300
            this.timelineUsers = []
            return
        }

        // Serialize users and prepare data
        const serializedUsers = validTimeline.map(_ => User.fromJson(_.user)).filter(Boolean)
        this.timelineUsers = [...serializedUsers].reverse()
        const developers = serializedUsers.map(_ => _.name || 'Unknown')
        
        const primaryColor = Color.fromVar('primary').toHexString()
        const dangerColor = Color.fromVar('danger').toHexString()
        const bgColor = Color.fromVar('bg1').toHexString()
        
        // Create timeline bar series
        const timelineSeries = serializedUsers.map((user: User, index: number) => ({
            name: user.name || 'Unknown',
            type: 'bar',
            stack: 'total',
            xAxisIndex: 0,
            yAxisIndex: 0,
            data: validTimeline[index].data.map((d: any) => parseFloat(d.sum) || 0),
            itemStyle: { color: user.color || primaryColor, opacity: 1, borderWidth: 0 },
            visualMap: false
        }))

        // Create heatmap data
        const heatmapData = serializedUsers.flatMap((user: User, userIdx: number) => 
            validTimeline[userIdx].data.map((d: any, dateIdx: number) => {
                const hpd = user.getAverageHpd() || 8
                const hoursWorked = parseFloat(d.sum) || 0
                const availableHours = hpd * workingDaysPerCluster
                const percentage = availableHours > 0 ? (hoursWorked / availableHours) * 100 : 0
                return {
                    value: [dateIdx, userIdx, percentage],
                    itemStyle: { color: this.getHeatmapColor(percentage) },
                    meta: {
                        date: d.month,
                        developer: user.name || 'Unknown',
                        hoursWorked,
                        availableHours,
                        percentage,
                        userColor: user.color || '#cccccc'
                    }
                }
            })
        )
        
        // Calculate dynamic height
        this.chartHeight = 160 + (developers.length * 20)

        const options: any = {
            backgroundColor: 'transparent',
            visualMap: {
                min: 0,
                max: 200,
                calculable: false,
                show: false,
                seriesIndex: [timelineSeries.length], // Only apply to heatmap (last series)
                inRange: {
                    color: ['transparent', primaryColor, dangerColor]
                }
            },
            grid: [
                // Timeline grid (top)
                {
                    top: 20,
                    height: 120,
                    left: 50,
                    right: 40,
                    containLabel: false
                },
                // Heatmap grid (bottom)
                {
                    top: 140,
                    bottom: 60,
                    left: 50,
                    right: 40,
                    containLabel: false,
                    height: developers.length * 20
                }
            ],
            xAxis: [
                // Timeline x-axis
                { type: 'category', data: clusters, gridIndex: 0, axisLabel: { show: false }, axisTick: { show: false }, axisLine: { show: false }, splitLine: { show: false } },
                // Heatmap x-axis
                { type: 'category', data: clusters, gridIndex: 1, axisLabel: { show: false }, axisTick: { show: false }, axisLine: { show: false }, splitLine: { show: false } }
            ],
            yAxis: [
                // Timeline y-axis (hours)
                { type: 'value', gridIndex: 0, min: 0, axisLabel: { show: false }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { show: false } },
                // Heatmap y-axis (developers)
                { type: 'category', data: developers, gridIndex: 1, axisLabel: { show: false }, axisTick: { show: false }, axisLine: { show: false }, splitLine: { show: true, lineStyle: { color: '#333' } } }
            ],
            series: [
                ...timelineSeries,
                {
                    name: 'Capacity',
                    type: 'heatmap',
                    data: heatmapData,
                    xAxisIndex: 1,
                    yAxisIndex: 1,
                    label: { show: false },
                    emphasis: { itemStyle: { borderColor: primaryColor, borderWidth: 2 } },
                    itemStyle: { borderWidth: 1, borderColor: bgColor },
                    tooltip: { trigger: 'item' },
                    progressive: 1000,
                    animation: true
                }
            ],
            tooltip: {
                ...ECHARTS_DEFAULT_TOOLTIP_OPTIONS,
                trigger: 'axis',
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                borderColor: primaryColor,
                borderWidth: 1,
                textStyle: {
                    color: '#fff',
                    fontSize: 12
                },
                axisPointer: {
                    type: 'shadow',
                    shadowStyle: {
                        color: 'rgba(59, 130, 246, 0.1)'
                    }
                },
                formatter: (params: any) => {
                    if (!Array.isArray(params)) params = [params]
                    
                    const firstParam = params[0]
                    if (firstParam.seriesType === 'heatmap') {
                        const { developer, date, hoursWorked, availableHours, percentage, userColor } = firstParam.data.meta
                        return `<div style="padding: 5px;">
                            <div style="font-weight: bold; color: ${userColor};">${developer}</div>
                            <div style="color: #999; font-size: 10px; margin-bottom: 5px;">${date}</div>
                            <div>Worked: <strong>${hoursWorked.toFixed(1)}h</strong></div>
                            <div>Available: <strong>${availableHours.toFixed(1)}h</strong></div>
                            <div style="font-weight: bold; font-size: 1.1em; color: ${userColor}; margin-top: 5px;">${percentage.toFixed(1)}%</div>
                        </div>`
                    }
                    
                    const barParams = params.filter((p: any) => p.seriesType === 'bar' && p.value > 0)
                    if (!barParams.length) return ''
                    
                    const total = barParams.reduce((sum: number, p: any) => sum + (p.value || 0), 0)
                    let html = `<div style="padding: 5px;">
                        <div style="font-weight: bold; margin-bottom: 5px;">${barParams[0].name}</div>
                        <div style="border-bottom: 1px solid #444; margin-bottom: 5px; padding-bottom: 3px;">
                            Total: <strong>${total.toFixed(1)}h</strong>
                        </div>`
                    
                    barParams.forEach((p: any) => {
                        const percentage = total > 0 ? ((p.value / total) * 100).toFixed(0) : 0
                        html += `<div style="display: flex; align-items: center; margin: 3px 0;">
                            <span style="width: 10px; height: 10px; background: ${p.color}; display: inline-block; margin-right: 5px; border-radius: 2px;"></span>
                            <span style="flex: 1;">${p.seriesName}</span>
                            <strong style="margin-left: 10px;">${(p.value || 0).toFixed(1)}h</strong>
                            <span style="color: #999; margin-left: 5px; font-size: 10px;">(${percentage}%)</span>
                        </div>`
                    })
                    return html + '</div>'
                }
            },
            legend: {
                show: false
            }
        }
        
        this.chartOptions = options

        // Build workshares for progress bar
        this.parent.current.var.workshares = validTimeline.map(_ => {
            const val = _.data.reduce((sum: number, d: any) => sum + (parseFloat(d.sum) || 0), 0)
            if (_.user) _.user.hours_invested = val
            return { name: _.user?.name || 'Unknown', color: _.user?.color || '#cccccc', val }
        })
    }

    toggleTimeBased() {
        const val = this.parent.current.is_time_based ? 0 : 1
        this.parent.current.update({ is_time_based: val }).subscribe(() => {
            this.parent.current.is_time_based = val
        })
    }

    onParentProjectSelected(project: any) {
        this.parent.current.update({ project_id: project.id }).subscribe(() => {
            this.parent.current.project_id = project.id
        })
    }

    onAssignmentActions = () => this.parent.reload()
    parseAssignments() {
        this.assignees = this.parent.current.assignees.filter(_ => _.assignee?.class == 'User')
        this.contacts = this.parent.current.assignees.filter(_ => _.assignee?.class == 'CompanyContact')
    }

    workloadDef = (_: Focus[], interval: string = 'day', min: number, max: number) => {
        const data: any = {}
        const _min = moment.unix(min * .001).startOf(interval as any)
        const _max = moment.unix(max * .001).startOf(interval as any)
        for (let i = _min; i < _max; i.add(1, interval as any)) { // autofill empty days
            data[i.valueOf()] = 0
        }
        for (const m of _) {
            const timestamp = m.time_started().startOf(interval as any).valueOf()
            data[timestamp] += m.duration
        }
        const user = _.length ? this.#global.userFor(_[0].user_id) : undefined
        const d: Record<string, any> = {}
        for (const date in data) {
            const x = moment.unix(parseInt(date) * .001).startOf(interval as any).unix() * 1000
            const y = .01 * Math.round(100 * data[date])
            if (!(x in d)) {
                d[x] = { x: x, y: 0 }
            }
            if (y) {
                d[x].y += y
            }
        }
        const node = {
            name: user ? user.name : '-',
            color: user ? user.colorCss : '#ffffff',
            data: Object.values(d),
            //user: user
        }
        return node
    }

    addCompanyContact(x: CompanyContact) {
        this.#assignmentService.addToProject(this.parent.current, { id: x.id, class: 'company_contact' }).subscribe((response: Assignee) => {
            this.contacts.push(response)
        })
    }

    get allAvailableContacts() {
        const contactGroups: {company: any, employees: CompanyContact[]}[] = []

        // Add main company employees
        if (this.parent.current?.company?.employees) {
            contactGroups.push({
                company: this.parent.current.company,
                employees: this.parent.current.company.employees
            })
        }

        // Add participating companies employees
        if (this.parent.current?.connection_projects) {
            this.parent.current.connection_projects.forEach(cp => {
                if (cp.other_company?.employees?.length > 0) {
                    contactGroups.push({
                        company: cp.other_company,
                        employees: cp.other_company.employees
                    })
                }
            })
        }
        return contactGroups
    }


    getColorForProgress(i: InvoiceItem): string {
        if (!i.progress) return 'text-grey'
        if (i.progress > .9) return 'text-danger'
        if (i.progress > .7) return 'text-warning'
        return ''
    }

    allMilestonesDone(i: InvoiceItem): boolean {
        if (!i.milestones || i.milestones.length === 0) return false
        return i.milestones.every(m => m.state === 2)
    }

    getItemTextColor(i: InvoiceItem): string {
        if (!i.milestones || i.milestones.length === 0) return ''
        if (i.milestones.every(m => m.state === 2)) return 'text-white'
        if (i.milestones.some(m => m.state === 0)) return 'text-muted'
        return ''
    }

    getUserContributions(item: InvoiceItem): {user: any, hours: number, percentage: number, color: string}[] {
        if (!item.foci_by_user || item.foci_by_user.length === 0) return []
        
        // Calculate total and max value for percentage calculation
        const totalHours = item.foci_by_user.reduce((sum, f) => sum + f.duration, 0)
        const estimatedHours = (item.pt || 0) * 8
        const maxValue = Math.max(totalHours, estimatedHours) || totalHours || 100
        
        // Build result array with user data from backend
        const result = item.foci_by_user.map(foci => {
            const userData = this.parent.current.timeline_chart?.find((tc: any) => tc.user?.id === foci.user_id)
            const user = userData?.user || this.#global.userFor(foci.user_id)
            return {
                user: user,
                hours: foci.duration,
                percentage: maxValue > 0 ? (foci.duration / maxValue) * 100 : 0,
                color: user?.color || '#cccccc'
            }
        })
        return result.sort((a, b) => b.hours - a.hours) // Sort by hours descending
    }

    getProgressColorClass(item: InvoiceItem): string {
        if (!item.progress) return 'text-muted'
        if (item.progress < 1) return 'text-white'
        if (item.progress < 1.5) return 'text-warning'
        return 'text-danger'
    }

    getNoFeatureFocusTime = () => {
        const totalUnfocused = this.parent.current.foci_sum ?? 0;
        const featureItemsTime = this.focusItems
            .filter((item) => item)
            .reduce((sum, item) => sum + ((item.progress ?? 0) * (item.pt ?? 0) * 8), 0);
        return Math.max(0, totalUnfocused - featureItemsTime);
    }

    getUnfocusedProgress = () => this.parent.current.no_invoice_focus / this.parent.current.hours_invested
    getFocusedProgress = () => 1 - this.getUnfocusedProgress()

    hasAssignee(x: Assignee): boolean {
        for (const a of this.assignees) {
            if (a.assignee.id == x.assignee.id) return true;
        }
        return false;
    }
    
    getMantisInstance() {
        return this.factory.instancesFor(this.parent.current, undefined) as MantisPlugin | undefined
    }

    getGitInstance() {
        return this.factory.instancesFor(this.parent.current, undefined) as GitLabPlugin | undefined
    }

    getMattermostInstance() {
        return this.factory.instancesFor(this.parent.current, undefined) as MattermostPlugin | undefined
    }


    onNewPluginLink(pluginInstance:PluginInstance) {
        if (pluginInstance instanceof MantisPlugin) {
            this.modalService.open(MantisProjectSelectionComponent, pluginInstance).then(response => {
                if (response) {
                    this.pluginLinkService.store(pluginInstance.toPluginLink(response), this.parent.current).subscribe(_ => {
                        this.parent.current.plugin_links.push(_)
                    })
                }
            }).catch()
        } else {
            this.inputModalService.open(pluginInstance.newPluginText).then((response) => {
                if (response && 'text' in response) {
                    this.pluginLinkService.store(pluginInstance.toPluginLink(response!.text), this.parent.current).subscribe(_ => {
                        this.parent.current.plugin_links.push(_)
                    })
                }
            }).catch()
        }
    }

    instanceFor = (_:Encryption) => this.factory.instanceFor(_)
    save = () => this.#projectService.update(this.parent.current.id, { name: this.name, description: this.description }).subscribe(this.parent.reload)
    createBlank (enc:Encryption) {
        const instance = this.factory.instanceFor(enc)!
        const p = instance.createBlankFor!(this.parent.current) as Promise<string>
        p.then((id:string) => {
            const existing = this.parent.current.plugin_links.filter(_ => this.factory.instanceFor(_)?.toPluginLink(id).url === _.url)
            if (existing.length) {
                Toast.info($localize`:@@i18n.projects.channel_already_added:Channel has already been added`)
            } else {
                this.pluginLinkService.store(instance.toPluginLink(id), this.parent.current).subscribe(_ => {
                    Toast.success($localize`:@@i18n.projects.channel_created:Channel has been created`)
                    this.parent.current.plugin_links.push(_)
                })
            }
        })
    }
}
