import { Component, ViewChild, ElementRef } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InvoiceItem } from '@models/invoice/invoice-item.model';
import { HotkeyDirective } from '@directives/hotkey.directive';
import { SafePipe } from 'src/pipes/safe.pipe';
import { ModalBaseComponent } from '@app/_modals/modal-base.component';

export interface CombineInvoiceItemsResult {
    description: string
}

@Component({
    selector: 'modal-combine-invoice-items',
    templateUrl: './modal-combine-invoice-items.component.html',
    styleUrls: ['./modal-combine-invoice-items.component.scss'],
    standalone: true,
    imports: [FormsModule, DecimalPipe, HotkeyDirective, SafePipe]
})
export class ModalCombineInvoiceItemsComponent extends ModalBaseComponent<CombineInvoiceItemsResult> {

    @ViewChild('customInput') customInput: ElementRef

    items: InvoiceItem[] = []
    selectedDescription: string = ''
    useCustom: boolean = false
    customDescription: string = ''

    init(items: InvoiceItem[]) {
        this.items = items
        if (items.length > 0) {
            this.selectedDescription = items[0].text
        }
    }

    onSuccess(): CombineInvoiceItemsResult {
        return { description: this.finalDescription }
    }

    selectDescription(text: string) {
        this.useCustom = false
        this.selectedDescription = text
    }

    enableCustom() {
        this.useCustom = true
        this.customDescription = ''
        setTimeout(() => this.customInput?.nativeElement?.focus(), 0)
    }

    get finalDescription(): string {
        return this.useCustom ? this.customDescription : this.selectedDescription
    }

    get combinedQty(): number {
        return this.items.reduce((sum, item) => sum + item.qty, 0)
    }

    get combinedTotal(): number {
        return this.items.reduce((sum, item) => sum + item.net, 0)
    }
}
