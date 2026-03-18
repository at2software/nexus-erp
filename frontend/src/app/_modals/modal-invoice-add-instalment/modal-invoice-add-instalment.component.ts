import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalBaseComponent } from '@app/_modals/modal-base.component';
import { InvoiceItemType } from '../../../enums/invoice-item.type';
import { ExpenseCategory } from '@models/expense/expense-category.model';
import { InvoiceItem } from '@models/invoice/invoice-item.model';
import { Invoice } from '@models/invoice/invoice.model';
import { HotkeyDirective } from '@directives/hotkey.directive';

@Component({
    selector: 'modal-invoice-add-instalment',
    templateUrl: './modal-invoice-add-instalment.component.html',
    styleUrls: ['./modal-invoice-add-instalment.component.scss'],
    standalone: true,
    imports: [FormsModule, HotkeyDirective]
})
export class ModalInvoiceAddInstalmentComponent extends ModalBaseComponent<InvoiceItem> {
    
    categories:ExpenseCategory[] = []
    item:InvoiceItem
    parent:Invoice
    
    init(_:Invoice): void { 
        this.parent = _ 
        this.item = InvoiceItem.fromJson({
            type      : InvoiceItemType.Instalment,
            vat_rate  : 0,
            vat_reason: 'INSTALMENT',
            qty       : -1,
            unit_name : 'Stk',
            invoice_id: _.id
        })
    }
    onSuccess = () => this.item

}