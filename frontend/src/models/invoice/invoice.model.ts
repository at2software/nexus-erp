import moment from 'moment';
import { InvoiceService } from "src/models/invoice/invoice.service"
import { Company } from "../company/company.model"
import { Serializable } from "../serializable"
import type { InvoiceItem } from "./invoice-item.model"
import { getInvoiceActions } from "./invoice.actions"
import { HasInvoiceItems } from "src/interfaces/hasInvoiceItems.interface"
import { NxGlobal } from "src/app/nx/nx.global"
import type { InvoiceReminder } from "./invoice-reminder.model"
import { map } from "rxjs"
import { AutoWrap, AutoWrapArray } from "@constants/autowrap"
import { IHasMarker } from 'src/enums/marker';

export class Invoice extends Serializable implements HasInvoiceItems, IHasMarker {

    static API_PATH = (): string => 'invoices'
    static WEBSOCKET_KEY = (): string => 'Invoice'
    SERVICE = InvoiceService

    marker: number | null = null

    due_at           : string | null     = null
    paid_at          : string | null     = null
    remind_at        : string | null     = null
    company_id       : string            = ''
    file_id          : string            = ''
    name             : string            = ''
    default_interest : number            = 0
    net              : number            = 0
    gross            : number            = 0
    gross_remaining  : number            = 0
    vat              : number            = 0
    is_cancelled     : boolean           = false
    is_booked        : boolean           = false
    stage            : number            = 0
    sent             : number            = 0

    is_overdue: boolean = false
    needs_reminder: boolean = false
    progress:number = 0
    progress_abs:string = ''
    span:number = 0
    since:number = 0

    @AutoWrap('Invoice') cancelled_by:Invoice
    @AutoWrap('Invoice') cancelles:Invoice
    @AutoWrap('Company') company:Company
    @AutoWrapArray('InvoiceItem') invoice_items:InvoiceItem[]
    @AutoWrapArray('InvoiceReminder') reminders:InvoiceReminder[]

    doubleClickAction: number = 0
    actions = getInvoiceActions(this)
    
    serialize = () => {
        this.is_overdue     = this.time_remind().isBefore(moment()) && !this.paid_at
        this.since          = -this.time_created().diff(moment(), 'days')
        this.needs_reminder = !this.paid_at && this.time_remind().isBefore(moment())
        this.span           = this.time_remind().diff(this.time_created(), 'days')
        this.progress       = this.paid_at ? 1 : this.since / this.span
        this.progress_abs   = '' + 100 * this.progress
        this.colorCss       = this.#getColorCss()
        this.badge          = this.is_overdue ? ['bg-danger', 'overdue'] : undefined
    }

    sendMail = () => NxGlobal.service.post(`invoices/${this.id}/send-mail`).pipe(map((_:any)=>Object.assign(this, this._serialize(_))))
    sendReminder = () => NxGlobal.service.post(`invoices/${this.id}/send-reminder`).pipe(map((_:any)=>Object.assign(this, this._serialize(_))))
    frontendUrl = (): string => `/invoices/${this.id}`
    getCompanyId = () => this.company_id
    setPaid = () => this.update({ paid: true })
    setUnpaid = () => this.update({ paid: false })
    getName = () => this.name
    time_due = (): moment.Moment => moment(this.due_at)
    time_remind = (): moment.Moment => moment(this.remind_at)
    time_paid = (): moment.Moment => moment(this.paid_at)
    
    getOverdueColor(): string {
        const daysOverdue = moment().diff(this.time_remind(), 'days')
        if (daysOverdue < NxGlobal.global.setting('INVOICE_GRACE_PERIOD')) return 'orange'
        return 'danger'
    }

    static formattedInvoiceNumber = (current?:string):string => {
        const prefix = NxGlobal.global.setting('INVOICE_NO_PREFIX')
        const suffix = NxGlobal.global.setting('INVOICE_NO_SUFFIX')
        const digits = NxGlobal.global.setting('INVOICE_NO_DIGITS')
        if (!current) current = '' + NxGlobal.global.setting('INVOICE_NO_CURRENT')
        while (current!.length < digits) current = '0' + current
        return prefix + current + suffix
    }

    isLatestInvoice():boolean {
        const current = parseInt(NxGlobal.global.setting('INVOICE_NO_CURRENT')) - 1
        return this.name === Invoice.formattedInvoiceNumber(`${current}`)
    }

    #getColorCss():string {
        if (this.is_cancelled) return 'dark'
        if (this.paid_at) return 'success'
        return 'teal'
    }

    d_left = (): number => this.paid_at ? this.time_paid().diff(this.time_created(), 'days') : this.time_remind().diff(moment(), 'days')
    s_due = (): string => this.time_due().format('DD.MM.YYYY')
    state = (): string => {
        if (this.is_cancelled) return 'cancelled'
        if (this.paid_at) return 'paid'
        if (this.time_remind().diff(moment()) > 0) return 'unpaid'
        return 'unpaid (overdue)'
    }

    cancel = () => NxGlobal.service.post('invoices/' + this.id + '/cancel')
    undo = () => NxGlobal.service.put(`invoices/${this.id}/undo`)
    updateValues = () => NxGlobal.service.put(`invoices/${this.id}/update-values`)
    sendToDatev = () => NxGlobal.service.post(`invoices/${this.id}/datev`).pipe(map((_:any)=>Object.assign(this, this._serialize(_))))

    // static helpers
    static aggregate = (_:Invoice[], format:string = 'YYYY'):Record<string, number> => _.reduce((x:any, i:Invoice) => {
        const f = i.time_created().format(format)
        x[f] = (x[f] || 0) + i.net
        return x
    }, {})
}
