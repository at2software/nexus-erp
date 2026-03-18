import { Component, inject } from "@angular/core"
import { CustomerDetailGuard } from "@app/customers/customers.details.guard"
import { ProjectDetailGuard } from "@app/projects/project-details.guard"
import { TimetrackingComponent } from "./timetracking.component"
import { AvatarComponent } from "@shards/avatar/avatar.component"
import { CommonModule } from "@angular/common"
import { CdkTableModule } from "@angular/cdk/table"
import { NComponent } from "@shards/n/n.component"
import { ContinuousMarkerComponent } from "@shards/continuous/continuous.marker.component"
import { EmptyStateComponent } from "@shards/empty-state/empty-state.component"
import { Nx } from "@app/nx/nx.directive"
import { NgbTooltipModule } from "@ng-bootstrap/ng-bootstrap"
import { EnableTableExportDirective } from "@app/app/table-controls/enable-table-export.directive"
import { FormsModule } from "@angular/forms"
import { NgxDaterangepickerMd } from "ngx-daterangepicker-material"
import { SafePipe } from "src/pipes/safe.pipe"

const SHARED_IMPORTS = [
        AvatarComponent,
        CommonModule,
        CdkTableModule,
        NComponent,
        ContinuousMarkerComponent,
        EmptyStateComponent,
        EnableTableExportDirective,
        Nx,
        NgbTooltipModule,
        FormsModule,
        NgxDaterangepickerMd,
        SafePipe,
    ]

@Component({
    templateUrl: './timetracking.component.html', 
    styleUrls: ['./timetracking.component.scss'],
    standalone: true,
    imports: SHARED_IMPORTS,
    host: { id: "TimetrackingCompanyComponent" }
})
export class TimetrackingCompanyComponent extends TimetrackingComponent {
    parent = inject(CustomerDetailGuard)
}

@Component({
    templateUrl: './timetracking.component.html', styleUrls: ['./timetracking.component.scss'],
    standalone: true,
    imports: SHARED_IMPORTS,
    host: { id: "TimetrackingProjectComponent" }
})
export class TimetrackingProjectComponent extends TimetrackingComponent {
    parent = inject(ProjectDetailGuard)
}
