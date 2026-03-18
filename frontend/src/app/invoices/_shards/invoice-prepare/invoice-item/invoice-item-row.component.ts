import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { InvoiceItem } from '@models/invoice/invoice-item.model';
import { GlobalService } from '@models/global.service';
import { Company } from '@models/company/company.model';
import { CommonModule } from '@angular/common';
import { TableRowAnnotationComponent } from './tr-annotation.component';
import { MoneyPipe } from '../../../../../pipes/money.pipe';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { AffixInputDirective } from '@directives/affix-input.directive';
import { FormsModule } from '@angular/forms';
import { AutosaveDirective } from '@directives/autosave.directive';
import { SafePipe } from '../../../../../pipes/safe.pipe';

export type InvoiceItemAnnotationType = 'invoice'|'quote'|'support'|'none'

@Component({
    selector: '[invoice-item-row]',
    templateUrl: './invoice-item-row.component.html',
    styleUrls: ['./invoice-item-row.component.scss'],
    standalone: true,
    imports: [CommonModule, TableRowAnnotationComponent, MoneyPipe, NgbTooltipModule, AffixInputDirective, FormsModule, AutosaveDirective, SafePipe]
})
export class InvoiceItemRowComponent {

    @Input() item:InvoiceItem
    @Input() company?:Company
    @Input() annotationType:InvoiceItemAnnotationType = 'invoice'

    @Output() singleActionResolvedResolved = new EventEmitter<any>()

    global = inject(GlobalService)
    
    _singleActionResolvedResolved = (_:any) => this.singleActionResolvedResolved.next(_)
    _onQuickQtyChange = (_:any) => { 
        this.item.qty = this.f(_)
        this.item.updateDynamicAttributes()
    }
    
    f = (m:any) => parseFloat(m)
}
