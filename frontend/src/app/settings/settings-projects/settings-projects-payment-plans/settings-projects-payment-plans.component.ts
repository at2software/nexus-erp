import { Component, ViewChild } from '@angular/core';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { PaymentPlanTiersEditorComponent } from '@shards/payment-plan-editor/payment-plan-tiers-editor.component';

@Component({
    selector: 'settings-projects-payment-plans',
    templateUrl: './settings-projects-payment-plans.component.html',
    standalone: true,
    imports: [ToolbarComponent, PaymentPlanTiersEditorComponent, NgbTooltipModule]
})
export class SettingsProjectsPaymentPlansComponent {
    @ViewChild('tiersEditor') tiersEditor!: PaymentPlanTiersEditorComponent
}
