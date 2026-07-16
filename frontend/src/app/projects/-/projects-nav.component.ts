import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '@app/app/header/header.component';
import { HeaderRouteNavComponent } from '@app/app/header/header-route-nav/header-route-nav.component';

@Component({
    selector: 'projects-nav',
    templateUrl: './projects-nav.component.html',
    styleUrls: ['./projects-nav.component.scss'],
    imports: [RouterModule, HeaderComponent, HeaderRouteNavComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectsNavComponent {}
