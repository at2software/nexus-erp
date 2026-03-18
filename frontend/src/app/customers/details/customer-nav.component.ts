import { Component, inject } from '@angular/core';
import { GlobalService } from '@models/global.service';
import { CustomerDetailGuard } from '@app/customers/customers.details.guard';
import { HeaderModule } from '@app/app/header/header.module';
import { RouterModule } from '@angular/router';
import { ActivityTabComponent } from '@activity/activity-tab.component';
import { TabCommentsComponent } from '@activity/tab-comments/tab-comments.component';
import { ActivityProjectsComponent } from '@app/projects/_shards/activity-projects/activity-projects.component';
import { HeaderRouteNavComponent } from '@app/app/header/header-route-nav/header-route-nav.component';
import { DndDirective } from '@directives/dnd.directive';
import { NexusModule } from '@app/nx/nexus.module';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { ProjectComponent } from '@shards/project/project.component';
import { SmartLinkDirective } from "@directives/smart-link.directive";

@Component({
    selector: 'customer-nav',
    templateUrl: './customer-nav.component.html',
    styleUrls: ['./customer-nav.component.scss'],
    standalone: true,
    imports: [HeaderModule, HeaderRouteNavComponent, RouterModule, ActivityTabComponent, TabCommentsComponent, ActivityProjectsComponent, DndDirective, NexusModule, NgbDropdownModule, ProjectComponent, SmartLinkDirective]
})

export class CustomerNavComponent {

    dataIntensity: any[]
    global = inject(GlobalService)
    parent = inject(CustomerDetailGuard)

    onDndUploaded = () => window.location.reload()
}
