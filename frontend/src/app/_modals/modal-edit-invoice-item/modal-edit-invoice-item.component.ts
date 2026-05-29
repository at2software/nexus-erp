import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { SearchInputComponent } from '@shards/search-input/search-input.component';
import { InvoiceItem } from '@models/invoice/invoice-item.model';
import { Product } from '@models/product/product.model';
import { DEFAULT_RTE_CONFIG } from '@shards/text-param-editor/default-rte-config';
import { GlobalService } from '@models/global.service';
import { Company } from '@models/company/company.model';
import { AngularEditorComponent, AngularEditorModule } from '@kolkov/angular-editor';
import { FormsModule } from '@angular/forms';
import { AffixInputDirective } from '@directives/affix-input.directive';
import { HotkeyDirective } from '@directives/hotkey.directive';
import { MoneyPipe } from '@pipes/money.pipe';
import { ModalBaseComponent } from '@app/_modals/modal-base.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'modal-edit-invoice-item',
    templateUrl: './modal-edit-invoice-item.component.html',
    styleUrls: ['./modal-edit-invoice-item.component.scss'],
    standalone: true,
    imports: [SearchInputComponent, AngularEditorModule, FormsModule, AffixInputDirective, HotkeyDirective, MoneyPipe],
})
export class ModalEditInvoiceItemComponent extends ModalBaseComponent<{ item: InvoiceItem; continue: boolean }> {
    readonly config = { ...DEFAULT_RTE_CONFIG, height: 'auto', minHeight: '0', maxHeight: 'auto' };

    private readonly search = viewChild.required(SearchInputComponent);
    private readonly titleEditor = viewChild.required(AngularEditorComponent);

    readonly item = signal<InvoiceItem>(null!);
    readonly currentProduct = signal<Product | undefined>(undefined);
    readonly okNextButtonText = signal('');
    readonly okButtonText = signal('');

    global = inject(GlobalService);
    #companyRef!: Company;
    #activeModal = inject(NgbActiveModal);

    init(item: InvoiceItem, companyRef: Company, okButtonText: string = 'Add', _header?: string, okNextButtonText?: string) {
        this.#companyRef = companyRef;
        this.okButtonText.set(okButtonText);
        if (okNextButtonText) this.okNextButtonText.set(okNextButtonText);
        this.setItem(item);
    }

    onSuccess = () => ({ item: this.item(), continue: false });
    acceptNext = () => this.#activeModal.close({ item: this.item(), continue: true });

    setItem = (item: InvoiceItem) => {
        this.item.set(item);
        if (item.product_source && item.product_source.id != '') {
            item.product_source.refresh().subscribe(x => {
                this.currentProduct.set(x);
                this.search().selected.set(x);
                this.search().query.set(x.name);
                this.titleEditor().focus();
            });
        }
    };

    #applyCompanyModifiers(item: InvoiceItem) {
        item.discount = parseFloat(this.#companyRef.getParam('INVOICE_DISCOUNT') ?? '0');
        if (this.#companyRef.isVatExcempt()) item.vat_rate = 0;
    }

    onSelect(product: any) {
        const item = this.item();
        if (product.invoice_items.length > 0) {
            const template = product.getInvoiceItem().getClone();
            this.currentProduct.set(product);
            this.#applyCompanyModifiers(template);
            const cp = this.currentProduct()!;
            if (cp.time_based > 0) {
                template.price = parseFloat(this.global.setting('INVOICE_HOURLY_WAGE'));
                template.unit_name = this.global.setting('INVOICE_HOUR_UNIT');
                if (cp.time_based == 8) {
                    template.price *= parseFloat(this.global.setting('INVOICE_HPD'));
                    template.unit_name = this.global.setting('INVOICE_DAY_UNIT');
                }
            }
            item.product_source_id = product.id;
            item.price = template.price;
            item.unit_name = template.unit_name;
            item.vat_rate = template.vat_rate;
            item.discount = template.discount;
            item.is_discountable = template.is_discountable;
            item.vat_calculation = template.vat_calculation;
            if (!item.text) item.text = template.text || product.name;
        }
        this.titleEditor().focus();
        item.product_source = Product.fromJson(product);
    }

    onTogglePriceVisiblity(a: HTMLSpanElement, b: HTMLSpanElement) {
        a.classList.add('d-none');
        b.classList.remove('d-none');
    }
}
