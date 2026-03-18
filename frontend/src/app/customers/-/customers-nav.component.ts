
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HeaderModule } from '@app/app/header/header.module';
import { HeaderRouteNavComponent } from '@app/app/header/header-route-nav/header-route-nav.component';
import { GlobalService } from '@models/global.service';

@Component({
    selector: 'customers-nav',
    templateUrl: './customers-nav.component.html',
    styleUrls: ['./customers-nav.component.scss'],
    standalone: true,
    imports: [RouterModule, HeaderModule, HeaderRouteNavComponent]
})
export class CustomersNavComponent {

    global = inject(GlobalService)
}