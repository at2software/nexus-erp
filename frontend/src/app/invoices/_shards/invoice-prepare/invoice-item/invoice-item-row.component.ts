import { Component, computed, inject, input, output } from '@angular/core';
import { DecimalPipe, DatePipe, NgTemplateOutlet } from '@angular/common';
import { InvoiceItem } from '@models/invoice/invoice-item.model';
import { GlobalService } from '@models/global.service';
import { Company } from '@models/company/company.model';
import { TableRowAnnotationComponent } from './tr-annotation.component';
import { MoneyPipe } from '../../../../../pipes/money.pipe';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { AffixInputDirective } from '@directives/affix-input.directive';
import { FormsModule } from '@angular/forms';
import { AutosaveDirective } from '@directives/autosave.directive';
import { SafePipe } from '../../../../../pipes/safe.pipe';

export type InvoiceItemAnnotationType = 'invoice' | 'quote' | 'support' | 'none'

@Component({
    selector: '[invoice-item-row]',
    templateUrl: './invoice-item-row.component.html',
    styleUrls: ['./invoice-item-row.component.scss'],
    standalone: true,
    imports: [NgTemplateOutlet, DecimalPipe, DatePipe, TableRowAnnotationComponent, MoneyPipe, NgbTooltipModule, AffixInputDirective, FormsModule, AutosaveDirective, SafePipe]
})
export class InvoiceItemRowComponent {
    item           = input.required<InvoiceItem>()
    company        = input<Company>()
    annotationType = input<InvoiceItemAnnotationType>('invoice')

    singleActionResolvedResolved = output<any>()

    global = inject(GlobalService)
    
    annotationMode = computed(() => this.annotationType() as 'invoice' | 'quote' | 'support')

    onQuickQtyChange(value: any) {
        const item = this.item()
        item.qty = parseFloat(value)
        item.updateDynamicAttributes()
    }

    f = (m: any) => parseFloat(m)
}
