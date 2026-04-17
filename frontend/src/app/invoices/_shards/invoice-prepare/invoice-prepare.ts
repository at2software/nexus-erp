import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { forkJoin } from 'rxjs';
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

type TNewItems = 'item' | 'paydown' | 'group' | 'discount'
interface VatEntry { title: string; value: number }

@Component({
    selector: 'invoice-prepare',
    templateUrl: './invoice-prepare.html',
    styleUrls: ['./invoice-prepare.scss'],
    standalone: true,
    imports: [ToolbarComponent, CommonModule, NexusModule, CdkTableModule, InvoiceItemRowComponent, MoneyPipe, NgbDropdownModule, NgbTooltipModule, CdkDrag, CdkDropList, HotkeyDirective, SpinnerComponent]
})
export class InvoicePrepare {

    #invoiceService = inject(InvoiceItemService)
    #modalGroups    = inject(InputModalService)
    #modalService   = inject(ModalBaseService)
    #global         = inject(GlobalService)

    parent          = input.required<HasInvoiceItems>()
    items           = input<InvoiceItem[] | undefined>(undefined)
    stageFilter     = input<number | undefined>(undefined)
    companyRef      = input<Company | undefined>(undefined)
    showTools       = input<boolean>(true)
    allowedNewItems = input<TNewItems[]>(['item', 'paydown', 'group', 'discount'])
    withInstalments = input<boolean>(true)
    annotationType  = input<InvoiceItemAnnotationType>('invoice')

    dataLoaded = output<InvoiceItem[]>()

    _items       = signal<InvoiceItem[]>([])
    vat          = signal<VatEntry[]>([])
    net          = signal<number>(0)
    gross        = signal<number>(0)
    lastGroup    = signal<InvoiceItem | undefined>(undefined)
    selection    = signal<InvoiceItem[]>([])
    selectionNet = signal<number>(0)
    selectionQty = signal<number>(0)
    loading      = signal<boolean>(false)

    regularItems    = computed(() => this.withInstalments() ? this._items().filter(_ => _.type !== InvoiceItemType.Instalment) : this._items())
    instalmentItems = computed(() => this.withInstalments() ? this._items().filter(_ => _.type === InvoiceItemType.Instalment) : [])
    remaining       = computed(() => this.gross() + this.instalmentItems().reduce((acc, _) => acc + _.gross, 0))
    isInvoice       = computed(() => this.parent() instanceof Invoice)
    company         = computed(() => this.parent() instanceof Company ? this.parent() as Company : undefined)
    project         = computed(() => this.parent() instanceof Project ? this.parent() as Project : undefined)
    invoice         = computed(() => this.parent() instanceof Invoice ? this.parent() as Invoice : undefined)
    product         = computed(() => this.parent() instanceof Product ? this.parent() as Product : undefined)
    effectiveCompany = computed(() => this.company() ?? this.project()?.company ?? this.invoice()?.company ?? this.companyRef())

    constructor() {
        registerLocaleData(locale)

        effect(() => {
            const itemsVal = this.items()
            if (itemsVal !== undefined) {
                const updated = this.#reindex(itemsVal)
                this._items.set(updated)
                this.dataLoaded.emit(updated)
            }
        })

        effect(() => {
            this.parent()
            if (untracked(() => this.items()) === undefined) {
                this.reload()
            }
        })

        NxGlobal.broadcast$.pipe(takeUntilDestroyed()).subscribe(broadcast => {
            const currentItems = this._items()
            if (!currentItems.length) return

            const updatedItem = broadcast.data as InvoiceItem
            if (!currentItems.some(item => item === updatedItem)) return

            if (currentItems.some(item => item.isNonPersistantRecord)) {
                this.#reindex(currentItems)
                this.dataLoaded.emit(currentItems)
            } else {
                this.reload()
            }
        })

        this.#global.onSelectionIn(() => this._items(), 'net', 'pt')
            .pipe(takeUntilDestroyed())
            .subscribe(([selection, selectionNet, selectionQty]) => {
                this.selection.set(selection)
                this.selectionNet.set(selectionNet)
                this.selectionQty.set(selectionQty)
            })
    }

    clear = () => this._items.set([])

    reload() {
        const parent = this.parent()
        if (!parent) return
        this.loading.set(true)
        this.#invoiceService.getInvoiceItems(parent, { append: 'my_prediction', with: 'predictions' }).subscribe(x => {
            const stage = this.stageFilter()
            if (stage !== undefined) x = x.filter(item => item.stage === stage && !item.invoice_id)
            x = x.sort((a, b) => a.position - b.position)
            const updated = this.#reindex(x)
            this._items.set(updated)
            this.dataLoaded.emit(updated)
            this.loading.set(false)
        })
    }

    #reindex(items: InvoiceItem[]): InvoiceItem[] {
        const { items: reindexed, net, gross, vat } = reindexInvoiceItems(items)
        this.net.set(net)
        this.gross.set(gross)
        this.vat.set(vat)
        this.#global.forceSelectionUpdate()
        return reindexed
    }

    hasNewSet = (_: TNewItems) => this.allowedNewItems().contains(_)

    onQuickQtyChange() {
        this._items.set(this.#reindex(this._items()))
    }

    onDrop = (e: CdkDragDrop<InvoiceItem[]>) => {
        const regularItems = [...this.regularItems()]
        const order = moveInvoiceItems(regularItems, e.previousIndex, e.currentIndex)

        // Keep non-regular rows in place and inject reordered regular rows in their new sequence.
        const reorderedRegularQueue = [...regularItems]
        const reordered = this._items().map(item => {
            if (item.type === InvoiceItemType.Instalment) return item
            return reorderedRegularQueue.shift() ?? item
        })

        this.#invoiceService.reorder(order).subscribe()
        this._items.set(this.#reindex(reordered))
    }

    singleActionResolved(e: ActionEmitterType) {
        const reloadTitles = [
            $localize`:@@i18n.common.delete:delete`,
            $localize`:@@i18n.invoices.combine:combine`,
            'active',
            'inactive'
        ]
        if (reloadTitles.includes(e.action.title)) {
            this.reload()
        } else {
            this._items.set(this.#reindex(this._items()))
        }
    }

    onNewItem = (continueWith?: InvoiceItem) => {
        const item = continueWith ?? this.#getNewItem()
        this.#modalService.open(ModalEditInvoiceItemComponent, item, this.companyRef(), 'Add', '@@i18n.invoice.addNewInvoiceItem', 'Add & next').then(_ => {
            if ('item' in _) {
                const key = InvoiceItem.parentField(this.parent())
                if (key) {
                    (_.item as any)[key] = this.parent().id
                    const payload = _.item.getPrimitives(['my_prediction'])
                    payload[key] = this.parent().id
                    payload.position = this.#getNextPosition()
                    _.item.store(payload).subscribe((x: InvoiceItem) => {
                        this._items.set(this.#reindex([...this._items(), InvoiceItem.fromJson(x)]))
                    })
                    if (_.continue) {
                        this.onNewItem(_.item)
                    }
                }
            }
        }).catch()
    }

    onNewPaydown = (continueWith?: InvoiceItem) => {
        const item = continueWith ?? this.#getNewItem()
        this.#modalService.open(ModalEditInvoiceItemComponent, item, this.companyRef(), 'Add', 'New paydown').then(_ => {
            if ('item' in _) {
                const key = InvoiceItem.parentField(this.parent())
                if (key) {
                    (_.item as any)[key] = this.parent().id

                    const payload = _.item.getPrimitives(['my_prediction'])
                    payload.position = this.#getNextPosition()
                    payload.type = InvoiceItemType.Paydown
                    payload.qty = -payload.qty

                    const payloadCompany = _.item.getPrimitives(['my_prediction'])
                    payloadCompany[key] = null
                    payloadCompany.company_id = this.parent().getCompanyId()
                    const proj = this.project()
                    if (proj) {
                        payloadCompany.text = `<b>${proj.name}</b><br>${payloadCompany.text}`
                        if (proj.po_number) {
                            payloadCompany.text = `${proj.po_number}<br>${payloadCompany.text}`
                        }
                    }

                    forkJoin([_.item.store(payload), _.item.store(payloadCompany)]).subscribe((a: InvoiceItem[]) => {
                        this._items.set(this.#reindex([...this._items(), InvoiceItem.fromJson(a[0])]))
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
            const payload = group.getPrimitives(['my_prediction'])
            payload.position = this.#getNextPosition()
            group.store(payload).subscribe((x: InvoiceItem) => {
                this._items.set(this.#reindex([...this._items(), InvoiceItem.fromJson(x)]))
            })
        }
    }).catch()

    onNewDiscount = () => this.#modalService.open(ModalInvoiceDiscountComponent, 'add discount', this.#getBasePrice()).then((res) => {
        if (res) {
            const _ = this.#getNewItem(InvoiceItemType.Discount)
            _.text = res.title
            _.price = res.price
            _.qty = res.qty
            _.unit_name = res.unit
            const payload = _.getPrimitives(['my_prediction'])
            payload.position = this.#getNextPosition()
            _.store(payload).subscribe((x: InvoiceItem) => {
                this._items.set(this.#reindex([...this._items(), InvoiceItem.fromJson(x)]))
            })
        }
    })

    #getFilteredCompanyNet = () => this.company()?.invoice_items.filter(a => a.type === InvoiceItemType.Default).reduce((a, b) => a + b.net, 0) ?? undefined
    #getBasePrice          = () => this.project()?.net ?? this.#getFilteredCompanyNet() ?? 0

    #getNewItem = (t: InvoiceItemType = InvoiceItemType.Default) => {
        const key = InvoiceItem.parentField(this.parent())
        const data: Record<string, unknown> = { type: t, position: 0 }
        if (key && this.parent()?.id) {
            data[key] = this.parent().id
        }
        const company = this.effectiveCompany()
        if (company?.getParam('INVOICE_DISCOUNT')) {
            data['discount'] = parseFloat(company.getParam('INVOICE_DISCOUNT') ?? '0')
        }
        if (company?.isVatExcempt) {
            data['vat_rate'] = 0
        }
        return InvoiceItem.fromJson(data)
    }

    #getNextPosition = (): number => {
        const next = Math.max(...this._items().map(ii => ii.position)) + 1
        return (!next || next === Infinity || next === -Infinity) ? 0 : next
    }
}
