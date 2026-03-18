import { Component, Input, Output, EventEmitter, ViewChild, OnChanges, OnInit, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { TextParamEditorComponent } from '@shards/text-param-editor/text-param-editor.component';
import { InvoicePrepare } from '@app/invoices/_shards/invoice-prepare/invoice-prepare';
import { CustomerPaymentDetailsComponent } from '@app/customers/_shards/customer-payment-details/customer-payment-details.component';
import { TBillingConsideration } from '@models/company/company.model';
import { Company } from '@models/company/company.model';
import { Project } from '@models/project/project.model';
import { InvoiceItem } from '@models/invoice/invoice-item.model';
import { InvoiceItemType } from '../../../../enums/invoice-item.type';
import { SafePipe } from '../../../../pipes/safe.pipe';

@Component({
    selector: 'invoice-prepare-wrapper',
    standalone: true,
    imports: [CommonModule, NgbTooltipModule, TextParamEditorComponent, InvoicePrepare, CustomerPaymentDetailsComponent, SafePipe],
    templateUrl: './invoice-prepare-wrapper.html',
    styleUrls: ['./invoice-prepare-wrapper.scss']
})
export class InvoicePrepareWrapper implements OnInit, OnChanges {

    @Input() parent: Company | Project
    @Input() items: InvoiceItem[] | undefined
    @Input() annotationType: 'invoice' | 'quote' | 'support' | 'none' = 'invoice'
    @Input() showMiniCards: boolean = true
    @Input() additionalBillingConsiderations: TBillingConsideration[] = []
    @Input() allowedNewItems: ('item'|'paydown'|'group'|'discount')[] = ['item','paydown','group','discount']
    @Input() withInstalments: boolean = true
    @Input() mode: 'invoice' | 'quote' = 'invoice'
    @Input() additionalItems?: TemplateRef<any>
    @Input() projectPaymentDuration?: string
    @Input() onChangeProjectPaymentDuration?: () => void
    @Input() onRemoveProjectPaymentDuration?: () => void
    @Output() considerationsChanged = new EventEmitter<TBillingConsideration[]>()

    @ViewChild(InvoicePrepare) table: InvoicePrepare

    allBillingConsiderations: TBillingConsideration[] = []
    prefixKey: string = 'INVOICE_PREFIX'
    suffixKey: string = 'INVOICE_SUFFIX'
    prefixTo: any
    suffixTo: any
    prefixObject: any
    suffixObject: any
    companyLocale: string = 'de-formal'

    get company(): Company {
        return this.parent instanceof Company ? this.parent : this.parent.company
    }

    #recalculateBillingConsiderations(items: InvoiceItem[] = []) {
        const considerations = [...this.additionalBillingConsiderations]

        for (const item of items) {
            if (item.invoice_id) continue
            if (!item.isRegularItem() && item.type !== InvoiceItemType.PreparedInstalment) continue

            if (item.hasVatDespiteId(this.company)) {
                considerations.push({
                    type: 'error',
                    label: item.text,
                    tooltip: 'item has VAT but company has VAT ID',
                    invoice_item_id: item.id
                })
            }
            if (item.hasVatExceptionWithoutId(this.company)) {
                considerations.push({
                    type: 'error',
                    label: item.text,
                    tooltip: 'item has no VAT but company has no VAT ID',
                    invoice_item_id: item.id
                })
            }
            if (item.hasVatWhenNotNeeded(this.company)) {
                considerations.push({
                    type: 'error',
                    label: item.text,
                    tooltip: 'item has VAT but company does not need VAT',
                    invoice_item_id: item.id
                })
            }
        }

        setTimeout(() => {
            this.allBillingConsiderations = considerations
            this.considerationsChanged.emit(considerations)
        })
    }

    #updateProperties() {
        this.prefixKey = this.mode === 'quote' ? 'PROJECT_PREFIX' : 'INVOICE_PREFIX'
        this.suffixKey = this.mode === 'quote' ? 'PROJECT_SUFFIX' : 'INVOICE_SUFFIX'

        if (this.mode === 'quote' && this.parent instanceof Project) {
            this.prefixTo = this.parent.personalized
            this.suffixTo = this.parent.personalized
            this.prefixObject = this.parent
            this.suffixObject = this.parent
        } else {
            this.prefixTo = this.company
            this.suffixTo = this.company
            this.prefixObject = this.company
            this.suffixObject = this.company
        }

        this.companyLocale = this.company?.getLocale() || 'de-formal'
    }

    ngOnInit() {
        this.#updateProperties()
    }

    ngOnChanges() {
        this.#updateProperties()
    }

    handleTableLoaded(items: InvoiceItem[]) {
        this.#recalculateBillingConsiderations(items)
    }

    trackBillingConsideration = (index: number, item: TBillingConsideration) => {
        return item.invoice_item_id || item.label + item.type
    }

    hasVatIssues = (): boolean => {
        return this.allBillingConsiderations.some(c => 
            c.tooltip?.includes('VAT') || 
            c.tooltip?.includes('vat')
        )
    }

    fixVatIssues = () => {
        if (!this.items) return

        const correctVatRate = this.company.getInvoiceItemVatRate()
        const itemsToFix = this.items.filter(item => 
            item.hasImplausibleVat(this.company)
        )

        if (itemsToFix.length === 0) return

        // Update all items with the correct VAT rate
        itemsToFix.forEach(item => {
            item.vat_rate = correctVatRate
            item.updateDynamicAttributes()
            item.update().subscribe()
        })

        // Recalculate billing considerations after a short delay
        setTimeout(() => {
            this.#recalculateBillingConsiderations(this.items)
            if (this.table) {
                this.table.reload()
            }
        }, 300)
    }
}
