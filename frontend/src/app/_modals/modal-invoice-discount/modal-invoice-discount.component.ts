import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GlobalService } from '@models/global.service';
import { ModalBaseComponent } from '@app/_modals/modal-base.component';

interface TRETURN {
    title: string;
    price: number;
    qty: number;
    unit: string;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'modal-invoice-discount',
    templateUrl: './modal-invoice-discount.component.html',
    styleUrls: ['./modal-invoice-discount.component.scss'],
    standalone: true,
    imports: [FormsModule],
})
export class ModalInvoiceDiscountComponent extends ModalBaseComponent<TRETURN> {
    private readonly titleField = viewChild.required<ElementRef>('title');
    private readonly valueField = viewChild.required<ElementRef>('value');

    readonly headerTitle = signal('');
    readonly basePrice = signal(0);
    hasPercent = false;

    global = inject(GlobalService);

    constructor() {
        super();
        afterNextRender(() => this.titleField().nativeElement.focus());
    }

    init(title: string, basePrice: number): void {
        this.headerTitle.set(title);
        this.basePrice.set(basePrice);
    }

    onSuccess = (): TRETURN => this.#getReturn();

    calculatePercentage = (percentage: number) => {
        if (this.basePrice() > 0)
            this.valueField().nativeElement.value = ((this.basePrice() * percentage) / 100).toFixed(2);
    };

    #getReturn = (): TRETURN => ({
        title: this.titleField().nativeElement.value,
        price: this.hasPercent ? this.basePrice() : this.valueField().nativeElement.value,
        qty: this.hasPercent ? -this.valueField().nativeElement.value : -1,
        unit: this.hasPercent ? '%' : this.global.currencySymbol(),
    });
}
