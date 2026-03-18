import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HeaderModule } from '@app/app/header/header.module';

@Component({
    selector: 'projects-nav',
    templateUrl: './projects-nav.component.html',
    styleUrls: ['./projects-nav.component.scss'],
    standalone: true,
    imports: [RouterModule, HeaderModule]
})
export class ProjectsNavComponent {

}
