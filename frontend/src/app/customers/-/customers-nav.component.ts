import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '@app/app/header/header.component';
import { HeaderRouteNavComponent } from '@app/app/header/header-route-nav/header-route-nav.component';
import { GlobalService } from '@models/global.service';

@Component({
    selector: 'customers-nav',
    templateUrl: './customers-nav.component.html',
    imports: [RouterModule, HeaderComponent, HeaderRouteNavComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomersNavComponent {
    global = inject(GlobalService);
}
