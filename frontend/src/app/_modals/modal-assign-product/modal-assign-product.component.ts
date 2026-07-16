import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { SearchInputComponent } from '@shards/search-input/search-input.component';
import { InvoiceItem } from '@models/invoice/invoice-item.model';
import { Product } from '@models/product/product.model';
import { Serializable } from '@models/serializable';
import { MoneyPipe } from '@pipes/money.pipe';
import { HotkeyDirective } from '@directives/hotkey.directive';
import { ModalBaseComponent } from '@app/_modals/modal-base.component';

export interface AssignProductResult {
    product?: Product;
    qtyFactor?: number;
    roundTo?: number;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'modal-assign-product',
    templateUrl: './modal-assign-product.component.html',
    imports: [SearchInputComponent, MoneyPipe, HotkeyDirective, FormsModule],
})
export class ModalAssignProductComponent extends ModalBaseComponent<AssignProductResult> {
    static override modalOptions: NgbModalOptions = { size: 'lg' };

    readonly item = signal<InvoiceItem>(null!);
    readonly currentProduct = signal<Product | undefined>(undefined);
    readonly qtyFactor = signal<number | undefined>(undefined);
    readonly roundTo = signal<number>(0.125);

    readonly canSubmit = computed(() => !!this.currentProduct() || (!!this.qtyFactor() && this.qtyFactor() !== 1));

    init(item: InvoiceItem) {
        this.item.set(InvoiceItem.fromJson(item.snapshot()));
        if (item.product_source && item.product_source.id != '') {
            this.currentProduct.set(item.product_source);
        }
    }

    onSuccess = (): AssignProductResult => ({ product: this.currentProduct(), qtyFactor: this.qtyFactor(), roundTo: this.roundTo() });

    onSelect(selected: Serializable) {
        const product = selected.assert(Product);
        if (!product) return;
        this.item().applyProduct(product, this.item().company);
        this.currentProduct.set(product);
    }
}
