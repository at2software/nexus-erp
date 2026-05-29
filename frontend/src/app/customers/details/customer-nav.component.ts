import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { tracked } from '@constants/tracked';
import { CustomerDetailGuard } from '@app/customers/customers.details.guard';
import { HeaderComponent } from '@app/app/header/header.component';
import { RouterModule } from '@angular/router';
import { ActivityTabComponent } from '@activity/activity-tab.component';
import { TabCommentsComponent } from '@activity/tab-comments/tab-comments.component';
import { ActivityProjectsComponent } from '@app/projects/_shards/activity-projects/activity-projects.component';
import { HeaderRouteNavComponent } from '@app/app/header/header-route-nav/header-route-nav.component';
import { DndDirective } from '@directives/dnd.directive';
import { Nx } from '@app/nx/nx.directive';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { ProjectComponent } from '@shards/project/project.component';
import { SmartLinkDirective } from '@directives/smart-link.directive';

@Component({
    selector: 'customer-nav',
    templateUrl: './customer-nav.component.html',
    styleUrls: ['./customer-nav.component.scss'],
    standalone: true,
    imports: [HeaderComponent, HeaderRouteNavComponent, RouterModule, ActivityTabComponent, TabCommentsComponent, ActivityProjectsComponent, DndDirective, Nx, ProjectComponent, NgbDropdownModule, ProjectComponent, SmartLinkDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerNavComponent {
    #parent = inject(CustomerDetailGuard);
    company = tracked(this.#parent.object);
    onDndUploaded = () => window.location.reload();
}
