import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalBaseComponent } from '../modal-base.component';
import { InvoiceItemService } from '@models/invoice/invoice-item.service';
import { InvoiceItemType, REPEATING_TYPES } from '@enums/invoice-item.type';
import { SpinnerComponent } from '@shards/spinner/spinner.component';

const TYPE_LABELS: Record<number, string> = {
    [InvoiceItemType.Daily]: 'daily',
    [InvoiceItemType.Weekly]: 'weekly',
    [InvoiceItemType.Monthly]: 'monthly',
    [InvoiceItemType.Quarterly]: 'quarterly',
    [InvoiceItemType.Yearly]: 'yearly',
};

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'modal-create-audit-invoice-item',
    standalone: true,
    imports: [FormsModule, SpinnerComponent],
    templateUrl: './modal-create-audit-invoice-item.component.html',
})
export class ModalCreateAuditInvoiceItemComponent extends ModalBaseComponent<any> {
    company?: any;
    saving = signal(false);

    name = '';
    price = 0;
    unit_name = 'month';
    type = InvoiceItemType.Monthly;
    next_recurrence_at = new Date().toISOString().slice(0, 10);

    readonly typeOptions = REPEATING_TYPES.map((t) => ({ value: t, label: TYPE_LABELS[t] }));

    #service = inject(InvoiceItemService);

    init(company: any, product?: any) {
        this.company = company;
        if (product) {
            const item = product.invoice_items?.[0];
            if (item) {
                this.name = item.name || product.name || '';
                this.price = item.net ?? item.price ?? 0;
                this.unit_name = item.unit_name || 'month';
                if (REPEATING_TYPES.includes(item.type)) this.type = item.type;
            } else {
                this.name = product.name || '';
            }
        }
    }

    onSuccess() {
        return null;
    }

    get canSave() {
        return this.name.trim() && this.price > 0 && this.next_recurrence_at;
    }

    save() {
        if (!this.canSave) return;
        this.saving.set(true);
        this.#service
            .store({
                name: this.name,
                price: this.price,
                unit_name: this.unit_name,
                type: this.type,
                next_recurrence_at: this.next_recurrence_at,
                company_id: this.company?.id,
            } as any)
            .subscribe({
                next: () => {
                    this.saving.set(false);
                    this.accept();
                },
                error: () => {
                    this.saving.set(false);
                },
            });
    }
}
