import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '@app/app/header/header.component';
import { HeaderLinkItemComponent } from '@app/app/header/header-link-item/header-link-item.component';

@Component({
    selector: 'marketing',
    templateUrl: './marketing.component.html',
    imports: [RouterModule, HeaderComponent, HeaderLinkItemComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketingComponent {}
