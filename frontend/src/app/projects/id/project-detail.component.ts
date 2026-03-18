import { Component, inject } from '@angular/core';
import { ProjectService } from 'src/models/project/project.service';
import { Project } from 'src/models/project/project.model';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { GlobalService } from 'src/models/global.service';
import { ProjectDetailGuard } from '../project-details.guard';
import { ProjectState } from '@models/project/project-state.model';
import { ProjectComponent } from '@shards/project/project.component';
import { ActivityTabComponent } from '@activity/activity-tab.component';
import { TabCommentsComponent } from '@activity/tab-comments/tab-comments.component';
import { ActivityProjectsComponent } from '../_shards/activity-projects/activity-projects.component';
import { HeaderModule } from '@app/app/header/header.module';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { SmartLinkDirective } from "@directives/smart-link.directive";
import { NexusModule } from '@app/nx/nexus.module';
import { HeaderRouteNavComponent } from '@app/app/header/header-route-nav/header-route-nav.component';

@Component({
    selector: 'project-detail',
    templateUrl: './project-detail.component.html',
    styleUrls: ['./project-detail.component.scss'],
    standalone: true,
    imports: [
    HeaderModule,
    ProjectComponent,
    HeaderRouteNavComponent,
    RouterModule,
    ActivityTabComponent,
    TabCommentsComponent,
    ActivityProjectsComponent,
    NexusModule,
    NgbDropdownModule,
    SmartLinkDirective
]
})
export class ProjectDetailComponent {

    dataIntensity: any[]
    dataPie      : any[]
    dataPieMax   : number = 0
    dataPieWage  : string

    global          = inject(GlobalService)
    #router         = inject(Router)
    #projectService = inject(ProjectService)
    service         = inject(ProjectDetailGuard)
    route           = inject(ActivatedRoute)
    
    onDndUploaded = () => window.location.reload()

    setParent = (_?:Project) => this.service.current.update({ project_id: (_ ? _.id : null) }).subscribe()

    setState = (event:any, requestedState:any) => {
        console.log(event, requestedState)
        event.preventDefault()
        event.stopPropagation()
        const newState = parseInt(requestedState)
        this.service.current.update({state: newState}).subscribe(() => {
            this.service.onChange.next(this.service.current)
            if ([3, 9].contains(newState)) {
                this.#router.navigate(['/projects/' + this.service.current.id + '/invoicing'])
            }
        })
    }

    prepareInvoice() {
        this.#projectService.moveRegularItemsToCustomer(this.service.current).subscribe(_ => {
            this.#router.navigate(['/customers/' + this.service.current.company_id + '/billing'])
        })
    }
    isStateAllowed = (_:ProjectState) => ProjectState.StateChangeWorkflow[this.service.current.state.id].contains(parseInt(_.id))

}
