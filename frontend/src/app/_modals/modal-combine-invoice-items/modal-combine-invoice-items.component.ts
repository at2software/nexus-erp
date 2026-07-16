import { ChangeDetectionStrategy, Component, viewChild, ElementRef, signal, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InvoiceItem } from '@models/invoice/invoice-item.model';
import { HotkeyDirective } from '@directives/hotkey.directive';
import { SafePipe } from '@pipes/safe.pipe';
import { ModalBaseComponent } from '@app/_modals/modal-base.component';

export interface CombineInvoiceItemsResult {
    description: string;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'modal-combine-invoice-items',
    templateUrl: './modal-combine-invoice-items.component.html',
    styleUrls: ['./modal-combine-invoice-items.component.scss'],
    imports: [FormsModule, DecimalPipe, HotkeyDirective, SafePipe],
})
export class ModalCombineInvoiceItemsComponent extends ModalBaseComponent<CombineInvoiceItemsResult> {
    protected customInput = viewChild.required<ElementRef>('customInput');

    items = signal<InvoiceItem[]>([]);
    selectedDescription = signal('');
    useCustom = signal(false);
    customDescription = signal('');

    finalDescription = computed(() => this.useCustom() ? this.customDescription() : this.selectedDescription());
    combinedQty = computed(() => this.items().reduce((sum, item) => sum + item.qty, 0));
    combinedTotal = computed(() => this.items().reduce((sum, item) => sum + item.net, 0));

    init = (items: InvoiceItem[]) => {
        this.items.set(items);
        this.selectedDescription.set(items[0]?.text ?? '');
    }

    onSuccess = (): CombineInvoiceItemsResult => ({ description: this.finalDescription() });

    selectDescription = (text: string) => {
        this.useCustom.set(false);
        this.selectedDescription.set(text);
    }

    enableCustom = () => {
        this.useCustom.set(true);
        this.customDescription.set('');
        setTimeout(() => this.customInput().nativeElement.focus(), 0);
    }
}
