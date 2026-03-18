import { Component, ViewChild, inject } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { SearchInputComponent } from '@shards/search-input/search-input.component';
import { InvoiceItem } from '@models/invoice/invoice-item.model';
import { Product } from '@models/product/product.model';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { DEFAULT_RTE_CONFIG } from '@shards/text-param-editor/default-rte-config';
import { GlobalService } from '@models/global.service';
import { deepMerge } from '@constants/deepMerge';
import { Company } from '@models/company/company.model';

import { AngularEditorComponent, AngularEditorModule } from '@kolkov/angular-editor';
import { FormsModule } from '@angular/forms';
import { AffixInputDirective } from '@directives/affix-input.directive';
import { HotkeyDirective } from '@directives/hotkey.directive';
import { MoneyPipe } from '../../../pipes/money.pipe';
import { ModalBaseComponent } from '@app/_modals/modal-base.component';

@Component({
    selector: 'modal-edit-invoice-item',
    templateUrl: './modal-edit-invoice-item.component.html',
    styleUrls: ['./modal-edit-invoice-item.component.scss'],
    standalone: true,
    imports: [SearchInputComponent, AngularEditorModule, FormsModule, AffixInputDirective, HotkeyDirective, MoneyPipe]
})
export class ModalEditInvoiceItemComponent extends ModalBaseComponent<{ item: InvoiceItem, continue: boolean }> {

    config = deepMerge({}, DEFAULT_RTE_CONFIG, { height: 'auto', minHeight: 0, maxHeight: 'auto' })

    @ViewChild(SearchInputComponent) search: SearchInputComponent
    @ViewChild(AngularEditorComponent) title: AngularEditorComponent
    @ViewChild('autosize') autosize: CdkTextareaAutosize;

    item: InvoiceItem
    stack: InvoiceItem[] = []
    companyRef:Company
    okNextButtonText: string
    okButtonText: string
    currentProduct: Product|undefined = undefined
    header: string | undefined = '@@i18n.invoice.addNewInvoiceItem'

    global = inject(GlobalService)
    #activeModal = inject(NgbActiveModal)

    init(item: InvoiceItem, companyRef:Company, okButtonText: string = 'Add', header?: string, okNextButtonText?: string) {
        this.setItem(item)
        this.okButtonText = okButtonText
        this.companyRef = companyRef
        if (okNextButtonText) this.okNextButtonText = okNextButtonText
        if (header) this.header = header
    }
    
    onSuccess = () =>  ({ item: this.item, continue: false })
    acceptNext = () => this.#activeModal.close({ item: this.item, continue: true })

    setItem = (item: InvoiceItem) => {
        this.item = item
        if (this.item.product_source && this.item.product_source.id != '') {
            this.item.product_source.show().subscribe(x => {
                this.currentProduct = x
                this.stack = x.invoice_items
                this.search.selected = x
                this.search.query = x.name
                this.title.focus()
            })
        }
    }
    applyCompanyModifiers(item: InvoiceItem) {
        item.discount = parseFloat(this.companyRef.getParam('INVOICE_DISCOUNT') ?? '0')
        if (this.companyRef.isVatExcempt) {
            item.vat_rate = 0
        }        
    }
    onSelect(product: any) {
        if (product.invoice_items.length > 0) {
            const template = product.getInvoiceItem().getClone()
            this.currentProduct = product
            this.applyCompanyModifiers(template)
            if (this.currentProduct!.time_based > 0) {
                template.price = parseFloat(this.global.setting('INVOICE_HOURLY_WAGE'))
                template.unit_name = this.global.setting('INVOICE_HOUR_UNIT')
                if (this.currentProduct!.time_based == 8) {
                    template.price *= parseFloat(this.global.setting('INVOICE_HPD'))
                    template.unit_name = this.global.setting('INVOICE_DAY_UNIT')
                }
            }

            // Update existing item properties instead of creating new InvoiceItem
            // This preserves the original snapshot so changes are detected
            this.item.product_source_id = product.id
            this.item.price = template.price
            this.item.unit_name = template.unit_name
            this.item.vat_rate = template.vat_rate
            this.item.discount = template.discount
            this.item.is_discountable = template.is_discountable
            this.item.vat_calculation = template.vat_calculation

            // Only update text if empty or hasn't been edited yet
            if (!this.item.text || this.item.text === this.item.snapshotData?.text) {
                this.item.text = template.text || product.name
            }
        }

        this.title.focus()
        this.item.product_source = Product.fromJson(product)
    }

    f = (_: any) => parseFloat(_)
    onTogglePriceVisiblity(a:HTMLSpanElement, b:HTMLSpanElement) {
        a.classList.add('d-none')
        b.classList.remove('d-none')
    }
}
