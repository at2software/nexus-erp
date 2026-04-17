import { CompanyService } from "src/models/company/company.service"
import { CompanyContact } from "./company-contact.model"
import { Project } from "../project/project.model"
import { Serializable } from "../serializable"
import { VcardClass } from "../vcard/VcardClass"
import { Invoice } from "../invoice/invoice.model"
import { NxGlobal } from "src/app/nx/nx.global"
import { InvoiceItem } from "../invoice/invoice-item.model"
import { HasInvoiceItems } from "src/interfaces/hasInvoiceItems.interface"
import type { File } from "../file/file.model"
import { IHasFiles } from "../file/has_files.interface"
import { Assignee } from "../assignee/assignee.model"
import { Focus } from "../focus/focus.model"
import { environment } from "src/environments/environment"
import { IHasFoci } from "@models/focus/hasFoci.interface"
import { User } from "@models/user/user.model"
import { LeadSource } from "@models/project/lead_source.model"
import { AutoWrap, AutoWrapArray } from "@constants/autowrap"
import moment from "moment"
import { IHasAssignees } from "src/interfaces/hasAssignees.interface"
import type { ConnectionProjects } from "./connection-projects.model"
import { getCompanyActions } from "./company.actions"
import { IHasMarker } from "src/enums/marker"

export interface TBillingConsideration {
    type: 'warning' | 'error'
    label: string
    tooltip: string
    project_id?: string
    uninvoiced_hours?: number
    invoice_item_id?: string
}

export class Company extends VcardClass implements HasInvoiceItems, IHasFiles, IHasFoci, IHasAssignees, IHasMarker {

    static override API_PATH = (): string => 'companies'
    override SERVICE = CompanyService

    default_product_id         : string                 = ''
    customer_number            : string                = ''
    value                      : number                = 0
    project_count              : number                = 0
    running_project_count      : number                = 0
    unpaid_invoice_count       : number                = 0
    invoice_count              : number                = 0
    revenue                    : number                = 0
    address                    : string                = ''
    vat_id                     : string                = ''
    managing_director          : string                = ''
    commercial_register        : string                = ''
    invoice_items              : InvoiceItem[]         = []
    net                        : number                = 0
    net_remaining              : number                = 0
    invoice_correction         : string                = ''
    invoice_email              : string                = ''
    has_direct_debit           : boolean               = false
    is_deprecated              : boolean = false
    lat                        : number|null           = null
    lon                        : number|null           = null
    requires_po                : boolean               = false
    has_nda                    : boolean               = false
    accepts_support            : boolean               = false
    needs_vat_handling        ?: boolean = true
    foci_unbilled_sum_duration?: number
    invoices_last12m_sum_net  ?: number
    total_time                ?: number
    remarketing_interval      ?: number
    desicion_duration         ?: number
    has_time_budget            : boolean
    billing_considerations    ?: TBillingConsideration[]
    quote_acceptance_rate     ?: number | null
    avg_payment_days          ?: number | null
    marker: number | null

    isVatExcempt        :boolean = false
    vatRate             :number  = 19
    remarketingDays     :number  = 0
    remarketingProgress :number   = 0
    lastUpdateDuration  :number  = 0
    source?:CompanyContact|User|LeadSource

    doubleClickAction: number = 0
    actions = getCompanyActions(this)
    
    @AutoWrap('Assignee') pivot                              : Assignee
    @AutoWrapArray('Project') projects_unfinished                 : Project[]
    @AutoWrapArray('Project') base_projects                       : Project[]
    @AutoWrapArray('CompanyContact') employees                    : CompanyContact[]
    @AutoWrapArray('Invoice') invoices                            : Invoice[]
    @AutoWrapArray('File') files                                  : File[]
    @AutoWrapArray('Assignee') assignees                          : Assignee[]
    @AutoWrapArray('InvoiceItem') upcoming_repeating_invoice_items: InvoiceItem[]
    @AutoWrapArray('Focus') foci                                  : Focus[]
    @AutoWrapArray('ConnectionProjects') available_connections     ?: ConnectionProjects[]
    
    serialize (json: any) {
        super.serialize(json)
        this.isVatExcempt = (this.vat_id?.length ?? 0) > 0
        this.vatRate = this.isVatExcempt ? 0 : 19
        if (!this.isEuropeanCountry()) this.vatRate = 0
        this.remarketingDays = this.#getRemarketingDays()
        this.lastUpdateDuration = moment().diff(this.time_updated(), 'days')
        this.remarketingProgress = this.lastUpdateDuration / this.remarketingDays
        this.ngLink = '/customers/' + this.id
        this.setSource(json?.source)
    }

    /**
     * Get the VAT rate that should be used for new invoice items.
     * This is more reliable than vatRate property which depends on country code being set.
     */
    getInvoiceItemVatRate = (): number => {
        // Company has VAT ID = reverse charge = no VAT on items
        if (this.vat_id?.length) return 0
        // Company doesn't need VAT handling = no VAT
        if (this.needs_vat_handling === false) return 0
        // Default: company needs VAT
        return 19
    }

    getCompanyId = () => this.id

    getLocale = (): string => {
        const lang = this.card.first('X-LANG')?.vals[0] || 'de';
        const formality = this.card.first('X-FORMALITY')?.vals[0] || 'formal';
        return `${lang}-${formality}`;
    }
    getAssignedUsers = ():Assignee[] => this.assignees.filter(_ => _.assignee instanceof User)
    frontendUrl = (): string => `/customers/${this.id}`
    getAcceptedChildren = ():typeof Serializable[] => [Project, InvoiceItem, Invoice, Focus]
    setParent = (_:Serializable) => console.error('setParent() not allowed for companies')
    #getRemarketingDays() {
        switch (this.remarketing_interval) {
            case 1: return 1;
            case 4: return 7;
            case 5: return 14;
            case 2: return 30;
            case 6: return 60;
            case 7: return 90;
            case 8: return 180;
            case 3: return 360;
        }
        return 0;
    }

    setSource(_?:any) {
        if (!_) return
        if (_.class === 'CompanyContact') this.source = CompanyContact.fromJson(_)
        if (_.class === 'User') this.source = User.fromJson(_)
        if (_.class === 'LeadSource') this.source = LeadSource.fromJson(_)
    }

    importImprint = () => NxGlobal.getService<CompanyService>(CompanyService).importImprint(this)

    averagePaymentDelay(): number {
        const paid = this.invoices.filter(i => i.paid_at)
        if (paid.length === 0) return 0
        return paid.reduce((sum, i) => sum + i.time_paid().diff(i.time_due(), 'days'), 0) / paid.length
    }

    static iconForId = (id:string) => environment.envApi + `companies/${id}/icon`
}