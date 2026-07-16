import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'marketing-campaigns',
    templateUrl: './marketing-campaigns.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketingCampaignsComponent {}
