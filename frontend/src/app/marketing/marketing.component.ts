import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HeaderModule } from '@app/app/header/header.module';

@Component({
    selector: 'marketing',
    templateUrl: './marketing.component.html',
    styleUrls: ['./marketing.component.scss'],
    standalone: true,
    imports: [RouterModule, HeaderModule]
})
export class MarketingComponent {

}
