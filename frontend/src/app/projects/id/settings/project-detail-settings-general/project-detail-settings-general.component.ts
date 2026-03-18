import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProjectDetailGuard } from '@app/projects/project-details.guard';
import { AutosaveDirective } from '@directives/autosave.directive';
import { PermissionsDirective } from '@directives/permissions.directive';
import { SmartLinkDirective } from '@directives/smart-link.directive';
import { GlobalService } from '@models/global.service';
import { NgbDate, NgbDatepickerModule, NgbDropdownModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { ProjectDefaultProductComponent } from '@app/projects/_shards/project-default-product/project-default-product.component';
import { AffixInputDirective } from '@directives/affix-input.directive';
import { InputModalService } from '@app/_modals/modal-input/modal-input.component';

@Component({
  standalone: true,
  imports: [SmartLinkDirective, FormsModule, PermissionsDirective, AutosaveDirective, CommonModule, ProjectDefaultProductComponent, AffixInputDirective, NgbDatepickerModule, NgbDropdownModule, NgbTooltipModule],
  selector: 'project-detail-settings-general',
  templateUrl: './project-detail-settings-general.component.html',
  styleUrl: './project-detail-settings-general.component.scss'
})
export class ProjectDetailSettingsGeneralComponent {
    parent = inject(ProjectDetailGuard)
    global = inject(GlobalService)
    #inputModalService = inject(InputModalService)

    onIndividualWageToggle($event: any) {
        if ($event.target.checked) {
            this.parent.current.individual_wage = parseFloat(this.global.setting('INVOICE_HOURLY_WAGE'));
        } else {
            this.parent.current.individual_wage = undefined;
        }
        this.parent.current.update({ individual_wage: this.parent.current.individual_wage ?? null }).subscribe()
    }
    onProjectUpdate = () => this.parent.current.update().subscribe()
    
    updateDate = (field:string, date:NgbDate) => {
        const d = `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`
        this.parent.current.update({ [field]: d }).subscribe()
    }

    onChangePaymentDuration() {
        this.#inputModalService.open($localize`:@@i18n.projects.setPaymentDuration:Set payment duration in days`)
            .then((result) => {
                if (result?.text) {
                    this.parent.current.updateParam('INVOICE_PAYMENT_DURATION', { value: result.text })
                        .subscribe(() => this.parent.reload())
                }
            })
    }

    removePaymentDuration() {
        // Use HTTP DELETE instead of updating with null value
        this.parent.current.httpService.delete(this.parent.current.getParamPath('INVOICE_PAYMENT_DURATION'))
            .subscribe(() => this.parent.reload())
    }
}
