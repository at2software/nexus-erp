import { Component, EventEmitter, Input, OnChanges, Output, inject, OnInit, OnDestroy } from '@angular/core';
import { InvoiceItemService } from '@models/invoice/invoice-item.service';
import { CommonModule, registerLocaleData } from '@angular/common';
import locale from '@angular/common/locales/de';
import { Project } from '@models/project/project.model';
import { ActionEmitterType } from '@app/nx/nx.directive';
import { ModalEditInvoiceItemComponent } from '@app/_modals/modal-edit-invoice-item/modal-edit-invoice-item.component';
import { InvoiceItemType } from '../../../../enums/invoice-item.type';
import { Product } from '@models/product/product.model';
import { Company } from '@models/company/company.model';
import { Invoice } from '@models/invoice/invoice.model';
import { InvoiceItem } from '@models/invoice/invoice-item.model';
import { InputModalService } from '@app/_modals/modal-input/modal-input.component';
import { moveInvoiceItems, reindexInvoiceItems } from './invoice-item.reorder.const';
import { HasInvoiceItems } from '../../../../interfaces/hasInvoiceItems.interface';
import { InvoiceItemAnnotationType, InvoiceItemRowComponent } from './invoice-item/invoice-item-row.component';
import { ModalInvoiceDiscountComponent } from '@app/_modals/modal-invoice-discount/modal-invoice-discount.component';
import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { forkJoin, Subscription } from 'rxjs';
import { GlobalService } from '@models/global.service';
import { NxGlobal } from '@app/nx/nx.global';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { NexusModule } from '@app/nx/nexus.module';
import { CdkTableModule } from '@angular/cdk/table';
import { MoneyPipe } from '../../../../pipes/money.pipe';
import { NgbDropdownModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { HotkeyDirective } from '@directives/hotkey.directive';
import { ModalBaseService } from '@app/_modals/modal-base-service';
import { SpinnerComponent } from '@shards/spinner/spinner.component';

type TNewItems = 'item'|'paydown'|'group'|'discount'
@Component({
    selector: 'invoice-prepare',
    templateUrl: './invoice-prepare.html',
    styleUrls: ['./invoice-prepare.scss'],
    standalone: true,
    imports: [ToolbarComponent, CommonModule, NexusModule, CdkTableModule, InvoiceItemRowComponent, MoneyPipe, NgbDropdownModule, NgbTooltipModule, CdkDrag, CdkDropList, HotkeyDirective, SpinnerComponent]
})
export class InvoicePrepare implements OnChanges, OnInit, OnDestroy {

    vat: any
    net: number = 0
    gross: number = 0
    lastGroup: InvoiceItem | undefined = undefined
    selection: InvoiceItem[] = []
    selectionNet: number
    selectionQty: number
    subscription:Subscription
    broadcastSubscription:Subscription
    loading: boolean = false

    #invoiceService = inject(InvoiceItemService)
    #modalGroups    = inject(InputModalService)
    #modalService  = inject(ModalBaseService)
    #global         = inject(GlobalService)

    @Input() parent: HasInvoiceItems
    @Input() items:InvoiceItem[]
    @Input() companyRef: Company
    @Input() showTools: boolean = true
    @Input() allowedNewItems:TNewItems[] = ['item','paydown','group','discount']
    @Input() withInstalments: boolean = true
    @Input() annotationType: InvoiceItemAnnotationType = 'invoice'
    @Output() dataLoaded: EventEmitter<InvoiceItem[]> = new EventEmitter<InvoiceItem[]>()

    constructor() { registerLocaleData(locale); }

    regularItems:InvoiceItem[] = []
    instalmentItems:InvoiceItem[] = []
    remaining:number
    isInvoice:boolean

    ngOnInit() {
        this.broadcastSubscription = NxGlobal.broadcast$.subscribe(broadcast => {
            if (!this.items || this.items.length === 0) return

            const updatedItem = broadcast.data as InvoiceItem
            const isOurItem = this.items.some(item => item === updatedItem)

            if (!isOurItem) return

            const hasNonPersistent = this.items.some(item => item.isNonPersistantRecord)
            if (hasNonPersistent) {
                this.reindex(this.items)
                this.dataLoaded.emit(this.items)
            } else {
                this.reload()
            }
        })
        this.subscription = this.#global.onSelectionIn(() => this.items, 'net', 'pt').subscribe(_ => {
            [this.selection, this.selectionNet, this.selectionQty] = _
        })
    }

    ngOnChanges(changes:any) {
        if ('parent' in changes && changes.parent !== undefined) {
            // Only reload from parent if no items array was provided
            if (!this.items || this.items.length === 0) {
                this.reload()
                this.items = this.parent.invoice_items
            }
        }
        if ('items' in changes && changes.items !== undefined) {
            this.reindex(this.items)
            this.computeVariables()
            this.dataLoaded.emit(this.items)
        }
    }
    ngOnDestroy() {
        this.subscription?.unsubscribe()
        this.broadcastSubscription?.unsubscribe()
    }
    computeVariables() {
        this.regularItems = this.withInstalments ? this.items.filter(_ => _.type !== InvoiceItemType.Instalment) : this.items
        this.instalmentItems = this.withInstalments ? this.items.filter(_ => _.type === InvoiceItemType.Instalment) : []
        this.remaining = this.gross + this.instalmentItems.reduce((acc, _) => acc + _.gross, 0)
        this.isInvoice = (this.parent instanceof Invoice) ? true : false
    }

    company = (): Company | undefined => this.parent instanceof Company ? this.parent as Company : undefined
    project = (): Project | undefined => this.parent instanceof Project ? this.parent as Project : undefined
    invoice = (): Invoice | undefined => this.parent instanceof Invoice ? this.parent as Invoice : undefined
    product = (): Product | undefined => this.parent instanceof Product ? this.parent as Product : undefined
    getCompany = () => this.company() ?? this.project()?.company ?? this.invoice()?.company ?? this.companyRef

    clear = () => this.items.splice(0, this.items.length)
    reload() {
        if (this.parent) {
            this.loading = true
            this.#invoiceService.getInvoiceItems(this.parent, { append: 'my_prediction', with: 'predictions' }).subscribe(x => {
                x = x.sort((a, b) => (a.position - b.position))
                const updated = this.reindex(x)
                this.items.splice(0, this.items.length, ...updated) // keep the potential parent reference
                this.computeVariables()
                this.dataLoaded.emit(this.items)
                this.loading = false
            })
        }
    }
    reindex (_: InvoiceItem[]): InvoiceItem[] {
        const { items, net, gross, vat } = reindexInvoiceItems(_)
        this.net              = net
        this.gross            = gross
        this.vat              = vat
        this.#global.forceSelectionUpdate()
        this.computeVariables()
        return items
    }
    hasNewSet = (_:TNewItems) => this.allowedNewItems.contains(_)

    onQuickQtyChange () {
        this.reindex(this.items)
    }
    onDrop = (e: any) => {
        const order = moveInvoiceItems(this.items, e.previousIndex, e.currentIndex)
        this.#invoiceService.reorder(order).subscribe()
        this.reindex(this.items)
    }
    singleActionResolved(e: ActionEmitterType) {
        if (e.action.title == $localize`:@@i18n.common.delete:delete`) {
            this.reload()
        }
        else if (e.action.title == $localize`:@@i18n.invoices.combine:combine`) {
            this.reload()
        }
        else if (e.action.title == 'active') {
            this.reload()
        }
        else if (e.action.title == 'inactive') {
            this.reload()
        } else {
            this.reindex(this.items)
        }
    }
    onNewItem = (continueWith?: InvoiceItem) => {
        const item = continueWith ?? this.#getNewItem()
        this.#modalService.open(ModalEditInvoiceItemComponent, item, this.companyRef, 'Add', '@@i18n.invoice.addNewInvoiceItem', 'Add & next').then(_ => {
            if ('item' in _) {
                const key = InvoiceItem.parentField(this.parent)
                if (key) {
                    (_.item as any)[key] = this.parent.id
                    const payload = _.item.getPrimitives(['my_prediction'])
                    payload[key] = this.parent.id
                    payload.position = this.#getNextPosition()
                    _.item.store(payload).subscribe((x: InvoiceItem) => {
                        this.items.push(InvoiceItem.fromJson(x))
                        this.reindex(this.items)
                    })
                    if (_.continue) {
                        this.onNewItem(_.item)
                    }
                }
            }
        }).catch()
    }
    onNewPaydown(continueWith?: InvoiceItem) {
        const item = continueWith ?? this.#getNewItem()
        this.#modalService.open(ModalEditInvoiceItemComponent, item, this.companyRef, 'Add', 'New paydown').then(_ => {
            if ('item' in _) {
                const key = InvoiceItem.parentField(this.parent)
                if (key) {
                    (_.item as any)[key] = this.parent.id

                    const payload = _.item.getPrimitives(['my_prediction'])
                    payload.position = this.#getNextPosition()
                    payload.type = InvoiceItemType.Paydown
                    payload.qty = -payload.qty

                    const payloadCompany = _.item.getPrimitives(['my_prediction'])
                    payloadCompany[key] = null
                    payloadCompany.company_id = this.parent.getCompanyId()
                    if (this.parent instanceof Project) {
                        const asProject = this.parent as Project
                        payloadCompany.text = `<b>${asProject.name}</b><br>${payloadCompany.text}`
                        if (asProject.po_number) {
                            payloadCompany.text = `${asProject.po_number}<br>${payloadCompany.text}`
                        }
                    }

                    forkJoin([_.item.store(payload), _.item.store(payloadCompany)]).subscribe((a:InvoiceItem[]) => {
                        this.items.push(InvoiceItem.fromJson(a[0]))
                        this.reindex(this.items)
                    })

                    if (_.continue) {
                        this.onNewItem(_.item)
                    }
                }
            }
        }).catch()
    }

    onNewGroup = () => this.#modalGroups.open('@@i18n.common.title').then((result) => {
        if (result) {
            const { text } = result
            const group = this.#getNewItem(InvoiceItemType.Header)
            group.text = text
            
            // Calculate correct position to put group at the end
            const payload = group.getPrimitives(['my_prediction'])
            payload.position = this.#getNextPosition()
            
            group.store(payload).subscribe((x:InvoiceItem) => {
                this.items.push(InvoiceItem.fromJson(x))
                this.reindex(this.items)
            })
        }
    }).catch()

    onNewDiscount = () => this.#modalService.open(ModalInvoiceDiscountComponent, 'add discount', this.#getBasePrice()).then((res) => {
        if (res) {
            const _ = this.#getNewItem(InvoiceItemType.Discount);
            ({
                title: _.text,
                price: _.price,
                qty: _.qty,
                unit: _.unit_name
            } = res)
            
            // Calculate correct position to put discount at the end
            const payload = _.getPrimitives(['my_prediction'])
            payload.position = this.#getNextPosition()
            
            _.store(payload).subscribe((x:InvoiceItem) => {
                this.items.push(InvoiceItem.fromJson(x))
                this.reindex(this.items)
            })
        }
    })

    #getFilteredCompanyNet = () => this.company()?.invoice_items.filter(a => a.type === InvoiceItemType.Default).reduce((a,b) => a + b.net, 0) ?? undefined
    #getBasePrice = () => this.project()?.net ?? this.#getFilteredCompanyNet() ?? 0
    #getParentField = (): string => this.company() ? 'company_id' : this.project() ? 'project_id' : 'project_id'

    #getNewItem = (t: InvoiceItemType = InvoiceItemType.Default) => {
        const data: any = { type: t, position: 0 }
        if (this.parent?.id) {
            data[this.#getParentField()] = this.parent.id
        }
        const company = this.getCompany()
        if (company?.getParam('INVOICE_DISCOUNT')) {
            data['discount'] = parseFloat(company.getParam('INVOICE_DISCOUNT') ?? '0')
        }
        if (company?.isVatExcempt) {
            data['vat_rate'] = 0
        }
        return InvoiceItem.fromJson(data)
    }

    /**
     * Calculates the next position for a new invoice item to be placed at the end
     * @returns The position number for the new item
     */
    #getNextPosition = (): number => {
        const nextPosition = Math.max(...this.items.map(ii => ii.position)) + 1
        if (!nextPosition || nextPosition === Infinity || nextPosition === -Infinity) {
            return 0
        }
        return nextPosition
    }

}
