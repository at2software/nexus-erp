import { ChangeDetectionStrategy, Component, viewChild } from '@angular/core';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { PaymentPlanTiersEditorComponent } from '@shards/payment-plan-editor/payment-plan-tiers-editor.component';

@Component({
    selector: 'settings-projects-payment-plans',
    templateUrl: './settings-projects-payment-plans.component.html',
    imports: [ToolbarComponent, PaymentPlanTiersEditorComponent, NgbTooltipModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsProjectsPaymentPlansComponent {
    protected readonly tiersEditor = viewChild.required<PaymentPlanTiersEditorComponent>('tiersEditor');
    addTier = () => this.tiersEditor().addTier();
}
