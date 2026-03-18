import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HrTeamService } from './hr-team/hr-team.service';
import { HeaderModule } from '@app/app/header/header.module';
import { PermissionsDirective } from '@directives/permissions.directive';

@Component({
    selector: 'hr-nav',
    templateUrl: './hr-nav.component.html',
    styleUrls: ['./hr-nav.component.scss'],
    standalone: true,
    imports: [HeaderModule, RouterModule, PermissionsDirective]
})
export class HrNavComponent {

    srv = inject(HrTeamService)

}