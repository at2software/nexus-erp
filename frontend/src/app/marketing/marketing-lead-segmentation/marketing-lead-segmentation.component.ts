import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'marketing-lead-segmentation',
    templateUrl: './marketing-lead-segmentation.component.html',
    styleUrls: ['./marketing-lead-segmentation.component.scss'],
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketingLeadSegmentationComponent {}
