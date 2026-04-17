import { getInvoiceItemTypeRepeatColor, InvoiceItemType, InvoiceItemTypeRepeating } from "src/enums/invoice-item.type"
import { InvoiceVatHandling } from "src/enums/invoice.vat-handling"
import { InvoiceItemService } from "src/models/invoice/invoice-item.service"
import { Product } from "../product/product.model"
import { Serializable } from "../serializable"
import { getInvoiceItemActions } from "./invoice-item.actions"
import { NxGlobal, TBroadcast } from "src/app/nx/nx.global"
import { Toast } from "src/app/_shards/toast/toast"
import { deepMerge } from "src/constants/deepMerge"
import { deepCopy } from "src/constants/deepClone"
import { Prediction } from "../prediction.model"
import { Project } from "../project/project.model"
import { Company } from "../company/company.model"
import { Invoice } from "./invoice.model"
import { REPEATING_MULT } from "../expense/expense.model"
import { map } from "rxjs"
import { InputModalService } from "@app/_modals/modal-input/modal-input.component"
import { AutoWrap, AutoWrapArray } from "@constants/autowrap"
import { ModalBaseService } from "@app/_modals/modal-base-service"
import { ModalEditInvoiceItemComponent } from "@app/_modals/modal-edit-invoice-item/modal-edit-invoice-item.component"
import type { Milestone } from "../milestones/milestone.model"
import { IHasMarker } from "src/enums/marker"

export class InvoiceItem extends Serializable implements IHasMarker {

    static API_PATH = (): string => 'invoice_items'
    SERVICE = InvoiceItemService

    product_id?: string
    project_id?: string
    company_id?: string
    invoice_id?: string
    product_source_id?: string
    position: number = 0
    text: string = ''
    vat_rate: number = 19
    vat_reason: string = ''
    price: number = 0
    qty: number = 1
    is_discountable: boolean = false
    unit_name: string = 'pcs'
    unit_factor: number = 0
    recurrence: string = ''
    next_recurrence_at?: string
    active: string = ''
    total: number = 0
    net: number = 0
    gross: number = 0
    vat: number = 0
    discount: number = 0
    wage: number = 0
    type: InvoiceItemType = InvoiceItemType.Default
    stage: number = 0
    vat_calculation: InvoiceVatHandling = InvoiceVatHandling.Net
    my_prediction: number | null = null
    predictions: Prediction[] = []
    price_discounted?: number
    vat_rate_dec?: number
    fociSum?:number
    foci_count?:number
    billed_foci_count?:number
    billed_foci_sum_duration?:number
    progress?: number
    marker: number | null = null
    foci_by_user?: {user_id: string, duration: number}[]

    canModifyQuantity:boolean
    qtyMultiplicator:number = 1
    isNonPersistantRecord:boolean = false

    @AutoWrap('Product') product_source:Product
    @AutoWrap('Company') company:Company
    @AutoWrapArray('Milestone') milestones:Milestone[]

    get _mult() { return this.unit_name == '%' ? 0.01 : 1 }
    get _total() { return this.qty * this.price * (1 - 0.01 * this.discount) * this._mult }
    get _net() { return this.vat_calculation == InvoiceVatHandling.Net ? this.total : this.total / 0.01 * (100 + this.vat) }
    get _gross() { return this.vat_calculation == InvoiceVatHandling.Net ? this.total * 0.01 * (100 + this.vat) : this.total }
    get pt() {
        return this.#calculatePersonDays(this.qty, this.unit_name)
    }

    doubleClickAction: number = 0
    actions = getInvoiceItemActions(this)

    serialize = () => {
        this.canModifyQuantity = this.type === 0
        if (this.unit_name === '%') {
            this.qtyMultiplicator = .01
        }
    }

    setParent = (_: Serializable): any => {
        if (_ instanceof Company) return this.update({ company_id: _.id, invoice_id: null, project_id: null }).subscribe(() => _.invoice_items.push(this))
        if (_ instanceof Project) return this.update({ company_id: null, invoice_id: null, project_id: _.id }).subscribe(() => _.invoice_items.push(this))
        if (_ instanceof Invoice) return this.update({ company_id: null, invoice_id: _.id, project_id: null }).subscribe(() => _.invoice_items.push(this))
        console.error('setting parent class ' + _.class + ' is not implemented yet for model InvoiceItem')
    }

    isRegularItem = () => [InvoiceItemType.Default, InvoiceItemType.Optional, InvoiceItemType.Inactive].includes(this.type)
    willAddToSum = () => [InvoiceItemType.Default, InvoiceItemType.Discount, InvoiceItemType.Paydown, InvoiceItemType.Instalment].includes(this.type)
    hasNumbering = () => this.willAddToSum() || this.type === InvoiceItemType.Optional

    hasVatExceptionWithoutId = (company?: Company) => this.vat_rate === 0 && (company?.needs_vat_handling && !((company ?? this.company).vat_id))
    hasVatDespiteId = (company?: Company) => this.vat_rate > 0 && ((company ?? this.company)?.vat_id ?? false)
    hasVatWhenNotNeeded = (company?: Company) => this.vat_rate > 0 && !(company ?? this.company)?.needs_vat_handling
    hasImplausibleVat = (company?: Company) => this.hasVatDespiteId(company) || this.hasVatExceptionWithoutId(company) || this.hasVatWhenNotNeeded(company)
    frontendEqualsBackend = (): boolean => this._total == this.total
    frontendEqualsBackendHover = () => this.frontendEqualsBackend() ? '' : `frontend value (${this._total} not equal to backend value (${this.total})`

    getName = () => this.text
    getRepeatString = () => InvoiceItemType[this.type]
    getYearlyPrice = (): number => {
        const type = this.type as InvoiceItemTypeRepeating
        return (type in REPEATING_MULT) ? REPEATING_MULT[type] * this.price : 0
    }    
    getRepeatColor = (): string => getInvoiceItemTypeRepeatColor(this.type)
    deletePrediction = () => NxGlobal.service.delete(`invoice_items/${this.id}/predict`).pipe(map((x: InvoiceItem) => {
        x.my_prediction = null
        Toast.success('Successfully deleted')
        return x
    }))

    getTemplate = (...args: any) => {
        return deepMerge(InvoiceItem.fromJson(NxGlobal.payloadFor(deepCopy(this), InvoiceItem, ['product_id'])), ...args)
    }
    updateDynamicAttributes() {
        this.price_discounted = Math.round(this.price * (100 - this.discount)) * 0.01
        this.vat_rate_dec = 0.01 * this.vat_rate
        this.unit_factor = this.unit_name === '%' ? 0.01 : 1
        this.total = this.price_discounted * this.qty * this.unit_factor
        this.net = this.vat_calculation === 0 ? this.total : Math.round(100 * this.total / (1 + this.vat_rate_dec)) * 0.01
        this.gross = this.vat_calculation === 1 ? this.total : Math.round(100 * this.total * (1 + this.vat_rate_dec)) * 0.01
        this.vat = this.gross - this.net
    }
    onEdit(success?: (v: any) => void, nxContext?: any) {
        const editItem = InvoiceItem.fromJson(this)
        switch (editItem.type) {
            case InvoiceItemType.Header: {
                const inputModal = NxGlobal.getService<InputModalService>(InputModalService)
                inputModal.open("@i18n.common.title").confirmed(({ text }) => {
                    editItem.text = text
                    if (!this.isNonPersistantRecord) {
                        editItem?.update().subscribe()
                        editItem.refresh()
                        NxGlobal.broadcast({type: TBroadcast.Update, data: editItem })
                    } else {
                        this._serialize(editItem)
                    }
                })
                break 
            }
            default: {
                // Use company from nxContext if available, otherwise fall back to this.company
                const company = nxContext?.company || this.company
                ModalBaseService.open(ModalEditInvoiceItemComponent, editItem, company, 'Save')
                    .then((_: any) => {
                        if (_ && _.item instanceof InvoiceItem) {
                            if (!this.isNonPersistantRecord) {
                                _.item.update().subscribe(() => {
                                    editItem.refresh()
                                    NxGlobal.broadcast({type: TBroadcast.Update, data: this })
                                })
                            } else {
                                this._serialize(_.item)
                                this.updateDynamicAttributes()
                                NxGlobal.broadcast({type: TBroadcast.Update, data: this })
                            }
                        }
                    })
                    .catch()
                break
            }
        }
    }

    static parentField(_: Serializable): string | undefined {
        if (_ instanceof Project) return 'project_id'
        if (_ instanceof Company) return 'company_id'
        if (_ instanceof Invoice) return 'invoice_id'
        if (_ instanceof Product) return 'product_id'
        return undefined
    }

    /**
     * Calculates the person days value for an invoice item based on its unit name
     * Used for converting different time units to standardized person days calculation
     * 
     * @param qty - Quantity from the invoice item
     * @param unitName - Unit name from the invoice item (PT = "Personen-Tage" / person days)
     * @returns Person days value in standardized units
     */
    #calculatePersonDays(qty: number, unitName: string): number {
        if (!unitName) return 0

        const normalizedUnit = unitName.toLowerCase()

        const dayUnit = NxGlobal.global?.setting('INVOICE_DAY_UNIT') || 'DAYS'
        const hourUnit = NxGlobal.global?.setting('INVOICE_HOUR_UNIT') || 'HOURS'
        const dayUnits = ['PT', 'DAYS', 'TAGE', 'TAG', 'DAY', 'D', dayUnit].map(u => u.toLowerCase())
        const hourUnits = ['HOURS', 'HRS', 'STD', 'STUNDEN', 'STUNDE', 'H', 'HOUR', hourUnit].map(u => u.toLowerCase())

        if (dayUnits.some(unit => normalizedUnit === unit || normalizedUnit === unit + '.')) {
            return qty
        }
        if (hourUnits.some(unit => normalizedUnit === unit || normalizedUnit === unit + '.')) {
            return qty / 8
        }
        return 0
    }
}