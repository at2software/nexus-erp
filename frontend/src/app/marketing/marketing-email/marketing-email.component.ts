import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'marketing-email',
    templateUrl: './marketing-email.component.html',
    styleUrls: ['./marketing-email.component.scss'],
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketingEmailComponent {}
