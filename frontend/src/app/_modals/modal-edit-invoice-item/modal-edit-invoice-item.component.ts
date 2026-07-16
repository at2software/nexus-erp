import { afterNextRender, ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { SearchInputComponent } from '@shards/search-input/search-input.component';
import { InvoiceItem } from '@models/invoice/invoice-item.model';
import { Product } from '@models/product/product.model';
import { Serializable } from '@models/serializable';
import { GlobalService } from '@models/global.service';
import { Company } from '@models/company/company.model';
import { QuillEditorComponent, QuillModules } from 'ngx-quill';
import type Quill from 'quill';
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
    imports: [SearchInputComponent, QuillEditorComponent, FormsModule, AffixInputDirective, HotkeyDirective, MoneyPipe],
})
export class ModalEditInvoiceItemComponent extends ModalBaseComponent<{ item: InvoiceItem; continue: boolean }> {
    readonly toolbarId = `modal-edit-invoice-item-toolbar-${Math.random().toString(36).slice(2)}`;
    readonly modules: QuillModules = { toolbar: { container: `#${this.toolbarId}` } };

    private readonly search = viewChild.required(SearchInputComponent);
    #titleEditor?: Quill;

    readonly item = signal<InvoiceItem>(null!);
    readonly currentProduct = signal<Product | undefined>(undefined);
    readonly okNextButtonText = signal('');
    readonly okButtonText = signal('');

    global = inject(GlobalService);
    #companyRef!: Company;
    #activeModal = inject(NgbActiveModal);

    // Quill registers its own (high-frequency) keystroke/selection listeners during construction.
    // Deferring its creation into afterNextRender() — which Angular always runs outside the zone —
    // keeps those listeners out of zone.js, so typing doesn't trigger a full-app change detection
    // tick on every keystroke.
    readonly editorReady = signal(false);

    constructor() {
        super();
        afterNextRender(() => this.editorReady.set(true));
    }

    onTitleEditorCreated(quill: Quill) {
        this.#titleEditor = quill;
    }

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
                this.#titleEditor?.focus();
            });
        }
    };

    onSelect(selected: Serializable) {
        const product = selected.assert(Product);
        if (!product) return;
        this.item().applyProduct(product, this.#companyRef);
        this.currentProduct.set(product);
        this.#titleEditor?.focus();
    }

    onTogglePriceVisiblity(a: HTMLSpanElement, b: HTMLSpanElement) {
        a.classList.add('d-none');
        b.classList.remove('d-none');
    }
}
