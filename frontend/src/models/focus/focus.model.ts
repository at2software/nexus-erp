import moment from 'moment';
import { FocusService } from "./focus.service"
import { Serializable } from "../serializable"
import { environment } from "src/environments/environment"
import { Color } from "src/constants/Color"
import { NxAction } from "src/app/nx/nx.actions"
import { User } from "../user/user.model"
import { InvoiceItem } from "../invoice/invoice-item.model"
import { Company } from "../company/company.model"
import { Project } from "../project/project.model"
import { NxGlobal } from "src/app/nx/nx.global"
import tz from 'moment-timezone';
import { IHasFoci } from "./hasFoci.interface"
import { AutoWrap } from "@constants/autowrap"
import { Accessor } from "@constants/accessor"
import { getFocusActions } from "./focus.actions";
import { IHasMarker } from 'src/enums/marker';

export class Focus extends Serializable implements IHasMarker {

    static API_PATH = (): string => 'foci'

    static filterByDateRange(foci: Focus[], startDate: moment.Moment, endDate: moment.Moment): Focus[] {
        return foci.filter(f =>
            startDate.diff(f.time_started(), 'seconds') < 0 &&
            endDate.diff(f.time_started(), 'seconds') >= 0
        )
    }
    SERVICE = FocusService

    duration        : number = 0
    started_at      : string = ''
    comment         : string|null = null
    user_id         : string = ''
    is_unpaid       : boolean = false
    parent_type    ?: string
    parent_id      ?: string
    parent_icon    ?: string
    parent_name    ?: string
    parent_path    ?: string
    invoice_item_id? : string
    invoiced_in_item_id?: string
    marker: number | null
    
    @AutoWrap('User') user:User
    @AutoWrap('InvoiceItem') invoice_item:InvoiceItem
    @AutoWrap('InvoiceItem') invoiced_in_item:InvoiceItem

    @Accessor<IHasFoci>((val:any) => {
        if (val?.class==='Company') return Company.fromJson(val)
        if (val?.class==='Project') return Project.fromJson(val)
        return val
    }) parent: IHasFoci

    doubleClickAction: number = 0
    actions:NxAction[] = getFocusActions(this)

    serialize (json: any) {
        this.appendFocusChangeContextMenu()
        this.icon = 'users/' + json.user_id + '/icon'
        
        if (!('user' in json) && json.user_id) {
            const u = NxGlobal.global.userFor(this.user_id)
            if (u) {
                this.user = u
            }
        }
    }
    
    setParent = (_:Serializable):any => {
        if (_ instanceof Company) return this.update({ parent_id:_.id, parent_type:'App\\Models\\Company' }).subscribe()
        if (_ instanceof Project) return this.update({ parent_id:_.id, parent_type:'App\\Models\\Project' }).subscribe()
        console.error('setting parent class ' + _.class + ' is not implemented yet')
    }
    getName = () => this.comment
    getInvoiceItemColor = () => Color.uniqueColorFromString('' + this.invoice_item_id)
    getInvoicedInItemColor = () => Color.uniqueColorFromString('' + this.invoiced_in_item_id)
    userIcon = (): string => environment.envApi + 'users/' + this.user_id + '/icon'
    fixParent() {
        if (this.parent.id !== '') return
        switch (this.parent_type) {
            case 'App\\Models\\Project':
                this.parent = { id: this.parent_id!, class:"Project" } as any
                break
            case 'App\\Models\\Company':
                this.parent = {id: this.parent_id!, class:"Company" } as any
                break
        }
    }

    get ended_at() { return tz.tz(this.started_at, tz.tz.guess()).add(this.duration, 'hours') }

    perc = (ts: moment.Moment): number => -ts.clone().startOf('day').diff(ts, 'seconds') / 86400
    pStart = (): string => 100 * this.perc(this.time_started()) + '%'
    pEnd = (): string => 100 * (1 - this.perc(this.time_ended())) + '%'
    ref = (): string => this.parent?.id || this.user_id || this.invoice_item_id || ''
    time_started = (): moment.Moment => moment(this.started_at)
    time_ended = (): moment.Moment => moment(this.ended_at)

    getParentName = () => this.isOwnCompany() ? 'Organizational' : this.parent?.name ?? 'Organizational'
    getParentIcon = () => environment.envApi + this.parent_icon

    color = ():string => {
        if (this.isOwnCompany()) return '#999999'
        return Color.fromHsl((170 + parseInt(this.ref()) * 161) % 360, 100, 45).toHexString()
    }

    isOwnCompany = () => this.parent?.class == 'Company' && this.parent?.id === NxGlobal.ME_ID
    isUnpaid = () => this.is_unpaid || this.isOwnCompany()

    appendFocusChangeContextMenu() {
        const user = NxGlobal.global.userFor(this.user_id)
        if (!user) return
        if (this.var.hasAppendFocusChangeContextMenu) return
        if (!user.latest_foci || user.latest_foci.length === 0) return
        this.var.hasAppendFocusChangeContextMenu = true
        this.actions.push({ 
            title: 'Assign', 
            group:true, 
            children:() => user.latest_foci!.map((_:any) => ({
                title : _.parent_name,
                group : true,
                action: () => this.update({ parent_path: _.parent_path}).subscribe()
            }))
        })
    }
}
