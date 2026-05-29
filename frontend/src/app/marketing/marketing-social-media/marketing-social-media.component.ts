import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'marketing-social-media',
    templateUrl: './marketing-social-media.component.html',
    styleUrls: ['./marketing-social-media.component.scss'],
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketingSocialMediaComponent {}
