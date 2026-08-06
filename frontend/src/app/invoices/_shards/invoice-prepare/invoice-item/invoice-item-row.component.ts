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
import { ActionEmitterType } from '@app/nx/nx.directive';
import { ExtIssueRef } from '@models/ext-issue/ext-issue-resolver.service';

export type InvoiceItemAnnotationType = 'invoice' | 'quote' | 'support' | 'none';

@Component({
    selector: '[invoice-item-row]',
    templateUrl: './invoice-item-row.component.html',
    styleUrls: ['./invoice-item-row.component.scss'],
    imports: [NgTemplateOutlet, DecimalPipe, DatePipe, TableRowAnnotationComponent, MoneyPipe, NgbTooltipModule, AffixInputDirective, FormsModule, AutosaveDirective, SafePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoiceItemRowComponent {
    readonly item = input.required<InvoiceItem>();
    readonly trackedItem = tracked(this.item);
    readonly company = input<Company | undefined>(undefined);
    readonly trackedCompany = tracked(this.company);
    annotationType = input<InvoiceItemAnnotationType>('invoice');
    extIssues = input<Record<string, ExtIssueRef>>({});

    singleActionResolved = output<ActionEmitterType>();


    annotationMode = computed(() => this.annotationType() as 'invoice' | 'quote' | 'support');

    onQuickQtyChange(value: unknown) {
        const item = this.trackedItem();
        item.qty = parseFloat(String(value));
        item.updateDynamicAttributes();
    }

    f = (m: number) => parseFloat(String(m));
}
