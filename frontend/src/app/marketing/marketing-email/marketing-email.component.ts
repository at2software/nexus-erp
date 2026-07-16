import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'marketing-email',
    templateUrl: './marketing-email.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketingEmailComponent {}
