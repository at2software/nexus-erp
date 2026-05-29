import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'marketing-campaigns',
    templateUrl: './marketing-campaigns.component.html',
    styleUrls: ['./marketing-campaigns.component.scss'],
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketingCampaignsComponent {}
