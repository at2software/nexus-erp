import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DecimalPipe, DatePipe, NgTemplateOutlet } from '@angular/common';
import { InvoiceItem } from '@models/invoice/invoice-item.model';
import { Company } from '@models/company/company.model';
import { TableRowAnnotationComponent } from './tr-annotation.component';
import { MoneyPipe } from '@pipes/money.pipe';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { AffixInputDirective } from '@directives/affix-input.directive';
import { FormsModule } from '@angular/forms';
import { AutosaveDirective } from '@directives/autosave.directive';
import { SafePipe } from '@pipes/safe.pipe';
import { tracked } from '@constants/tracked';

export type InvoiceItemAnnotationType = 'invoice' | 'quote' | 'support' | 'none';

@Component({
    selector: '[invoice-item-row]',
    templateUrl: './invoice-item-row.component.html',
    styleUrls: ['./invoice-item-row.component.scss'],
    standalone: true,
    imports: [NgTemplateOutlet, DecimalPipe, DatePipe, TableRowAnnotationComponent, MoneyPipe, NgbTooltipModule, AffixInputDirective, FormsModule, AutosaveDirective, SafePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoiceItemRowComponent {
    readonly itemIn = input.required<InvoiceItem>({ alias: 'item' });
    readonly item = tracked(this.itemIn);
    readonly companyIn = input<Company>(undefined, { alias: 'company' });
    readonly company = tracked(this.companyIn);
    annotationType = input<InvoiceItemAnnotationType>('invoice');

    singleActionResolved = output<any>();


    annotationMode = computed(() => this.annotationType() as 'invoice' | 'quote' | 'support');

    onQuickQtyChange(value: any) {
        const item = this.item();
        item.qty = parseFloat(value);
        item.updateDynamicAttributes();
    }

    f = (m: any) => parseFloat(m);
}
