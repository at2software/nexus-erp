import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { InvoiceItemService } from '@models/invoice/invoice-item.service';
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
    standalone: true,
    imports: [DecimalPipe, SpinnerComponent],
    templateUrl: './modal-select-invoice-item.component.html',
})
export class ModalSelectInvoiceItemComponent implements OnInit {
    items: any[] = [];
    loading = signal(true);

    activeModal = inject(NgbActiveModal);
    #service = inject(InvoiceItemService);

    ngOnInit() {
        this.#service.indexStandingOrders().subscribe({
            next: (items: any) => {
                this.items = items;
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

    select(item: any) {
        this.activeModal.close(item);
    }
}
