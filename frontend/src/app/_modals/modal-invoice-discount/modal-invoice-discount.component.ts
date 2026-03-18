
import { Component, ElementRef, ViewChild, inject, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GlobalService } from '@models/global.service';
import { ModalBaseComponent } from '@app/_modals/modal-base.component';

interface TRETURN {
    title:string,
    price:number,
    qty:number,
    unit:string
}
@Component({
    selector: 'modal-invoice-discount', templateUrl: './modal-invoice-discount.component.html', styleUrls: ['./modal-invoice-discount.component.scss'],
    standalone: true,
    imports: [FormsModule]
})
export class ModalInvoiceDiscountComponent extends ModalBaseComponent<TRETURN> implements AfterViewInit {

    headerTitle      : string = ''
    basePrice :number   = 0
    result     : string = ''
    hasPercent:boolean  = false

    @ViewChild('title') titleField: ElementRef
    @ViewChild('value') valueField: ElementRef
    @ViewChild('basePriceField') basePriceField: ElementRef

    global = inject(GlobalService)

    init(title:string, basePrice:number): void {
        this.headerTitle = title
        this.basePrice = basePrice
    }
    ngAfterViewInit() {
        this.titleField.nativeElement.focus()
    }
    onSuccess = (): TRETURN => this.#getReturn()

    calculatePercentage = (percentage: number) => {
        if (this.basePrice > 0) {
            const calculatedValue = (this.basePrice * percentage / 100).toFixed(2);
            this.valueField.nativeElement.value = calculatedValue;
        }
    }

    #getReturn = ():TRETURN => ({
        title: this.titleField.nativeElement.value,
        price: this.hasPercent ? this.basePrice   : this.valueField.nativeElement.value,
        qty  : this.hasPercent ? -this.valueField.nativeElement.value : -1,
        unit : this.hasPercent ? '%' : this.global.currencySymbol()
    })

}