import { Component, inject, Input, Optional, TemplateRef } from '@angular/core';
import { CustomerDetailGuard } from '../../customers.details.guard';
import { InputModalService } from '@app/_modals/modal-input/modal-input.component';
import { forkJoin } from 'rxjs';
import { Company } from '@models/company/company.model';

import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompanyLocaleSelectorComponent } from '../company-locale-selector/company-locale-selector.component';

@Component({
    selector: 'customer-payment-details',
    templateUrl: './customer-payment-details.component.html',
    styleUrls: ['./customer-payment-details.component.scss'],
    standalone: true,
    imports: [NgbTooltipModule, CommonModule, FormsModule, CompanyLocaleSelectorComponent]
})
export class CustomerPaymentDetailsComponent {
    @Input() company: Company
    @Input() additionalItems?: TemplateRef<any>
    @Input() projectPaymentDuration?: string
    @Input() onChangeProjectPaymentDuration?: () => void
    @Input() onRemoveProjectPaymentDuration?: () => void

    @Optional() parent = inject(CustomerDetailGuard, { optional: true })
    input = inject(InputModalService)

    get current(): Company | undefined {
        return this.company || this.parent?.current
    }

    get hasProjectPaymentDuration(): boolean {
        return !!this.projectPaymentDuration
    }

    get effectivePaymentDuration(): string {
        return this.projectPaymentDuration || this.current?.getParam('INVOICE_PAYMENT_DURATION') || '14'
    }

    hasDiscount = () => parseFloat(this.current?.getParam('INVOICE_DISCOUNT') ?? '0') > 0

    onLocaleChanged() {
        this.parent?.reload();
    }

    handlePaymentDurationClick() {
        if (this.onChangeProjectPaymentDuration) {
            this.onChangeProjectPaymentDuration()
        } else {
            this.onChangeParam('INVOICE_PAYMENT_DURATION')
        }
    }
    
    onChangeParam(param:string) {
        this.input.open($localize`:@@i18n.customers.set_new_value:set new value`).then((r) => {
            if (r?.text) {
                this.current!.updateParam(param, { value: r.text }).subscribe(() => this.parent?.reload())
            }
        })
    }
    async onChangeSepa() {
        const mandate = (await this.input.open($localize`:@@i18n.customers.set_mandate_reference:set mandate reference`))?.text ?? undefined
        const iban = (await this.input.open($localize`:@@i18n.customers.set_iban:set IBAN`))?.text ?? undefined
        forkJoin([
            this.current!.updateParam('INVOICE_DD_MANDATE', { value: mandate }),
            this.current!.updateParam('INVOICE_DD_IBAN', { value: iban }),
        ]).subscribe(() => this.parent?.reload())
    }
    removeDiscount() {
        this.current!.updateParam('INVOICE_DISCOUNT', { value: null }).subscribe(() => this.parent?.reload())
    }
    removeSepa() {
        forkJoin([
            this.current!.updateParam('INVOICE_DD_MANDATE', { value: null }),
            this.current!.updateParam('INVOICE_DD_IBAN', { value: null }),
        ]).subscribe(() => this.parent?.reload())
    }
    onChangeEmail() {
        this.input.open($localize`:@@i18n.customers.set_new_email:set new email`).then((r) => {
            if (r?.text) {
                this.current!.update({ invoice_email: r.text }).subscribe(() => this.parent?.reload())
            }
        })
    }
    onChangeVat() {
        this.input.open($localize`:@@i18n.customers.set_new_vat_id:set new VAT ID`).then((r) => {
            if (r?.text) {
                this.current!.update({ vat_id: r.text }).subscribe(() => this.parent?.reload())
            } else {
                this.current!.update({ vat_id: null }).subscribe(() => this.parent?.reload())
            }
        })
    }
}
