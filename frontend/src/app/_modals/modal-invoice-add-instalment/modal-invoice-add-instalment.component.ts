import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalBaseComponent } from '@app/_modals/modal-base.component';
import { InvoiceItemType } from '../../../enums/invoice-item.type';
import { ExpenseCategory } from '@models/expense/expense-category.model';
import { InvoiceItem } from '@models/invoice/invoice-item.model';
import { Invoice } from '@models/invoice/invoice.model';
import { HotkeyDirective } from '@directives/hotkey.directive';
import { Project } from '@models/project/project.model';
import { GlobalService } from '@models/global.service';

interface InstalmentModalOptions {
    defaultText?: string
}

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
    parent: Project | Invoice
    displayBasePrice = 0
    percentage = 30

    global = inject(GlobalService)

    get basePrice(): number {
        return this.displayBasePrice
    }

    set basePrice(value: number) {
        this.displayBasePrice = value
    }
    
    init(_: Project | Invoice, options?: InstalmentModalOptions): void {
        this.parent = _
        this.displayBasePrice = this.#calculateStage0Sum()
        this.item = InvoiceItem.fromJson({
            type      : InvoiceItemType.Instalment,
            vat_rate  : 0,
            vat_reason: 'INSTALMENT',
            qty       : -1,
            unit_name : 'Stk',
            text      : options?.defaultText || $localize`:@@i18n.common.addInstalment:instalment`
        })

        if (_ instanceof Invoice) this.item.invoice_id = _.id
        if (_ instanceof Project) this.item.project_id = _.id

        this.applyPercentage()
    }

    #calculateStage0Sum(): number {
        // For Projects: sum only stage=0 items (always fresh from current state)
        if (this.parent instanceof Project) {
            const items = (this.parent.invoice_items ?? []).filter(item => item.stage === 0 && !item.invoice_id)
            return items.reduce((sum, item) => sum + (item.net ?? 0), 0)
        }
        
        // For Invoices: use net
        return this.parent.net ?? 0
    }

    setPercentage = (value: number) => {
        this.percentage = value
        this.displayBasePrice = this.#calculateStage0Sum()  // Refresh from current state
        this.applyPercentage()
    }

    applyPercentage = () => {
        const base = Number(this.displayBasePrice) || 0
        const percent = Number(this.percentage) || 0
        if (base <= 0 || percent <= 0) {
            this.item.price = 0
            return
        }
        this.item.price = Number(((base * percent) / 100).toFixed(2))
    }

    onSuccess = () => this.item

}