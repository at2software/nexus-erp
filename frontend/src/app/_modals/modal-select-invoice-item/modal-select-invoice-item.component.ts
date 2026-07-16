import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { InvoiceItemService } from '@models/invoice/invoice-item.service';
import { InvoiceItem } from '@models/invoice/invoice-item.model';
import { SpinnerComponent } from '@shards/spinner/spinner.component';
import { InvoiceItemType, getInvoiceItemTypeRepeatColor } from '@enums/invoice-item.type';

const TYPE_LABELS: Record<number, string> = {
    [InvoiceItemType.Daily]: 'daily',
    [InvoiceItemType.Weekly]: 'weekly',
    [InvoiceItemType.Monthly]: 'monthly',
    [InvoiceItemType.Quarterly]: 'quarterly',
    [InvoiceItemType.Yearly]: 'yearly',
};

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'modal-select-invoice-item',
    imports: [DecimalPipe, SpinnerComponent],
    templateUrl: './modal-select-invoice-item.component.html',
})
export class ModalSelectInvoiceItemComponent {
    items = signal<InvoiceItem[]>([]);
    loading = signal(true);

    activeModal = inject(NgbActiveModal);
    #service = inject(InvoiceItemService);

    constructor() {
        this.#service.indexStandingOrders().subscribe({
            next: (items: InvoiceItem[]) => {
                this.items.set(items);
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
            },
        });
    }

    typeLabel(type: number) {
        return TYPE_LABELS[type] ?? '';
    }
    typeColor(type: number) {
        return getInvoiceItemTypeRepeatColor(type as InvoiceItemType);
    }

    select(item: InvoiceItem) {
        this.activeModal.close(item);
    }
}
