import { Component, inject, OnInit } from "@angular/core";
import { User } from "src/models/user/user.model";
import { HrTeamService } from "../hr-team/hr-team.service";
import { HrWorkloadComponent } from "./hr-workload.component";
import { HrWorkloadHeatmapComponent } from "../hr-workload-heatmap/hr-workload-heatmap.component";

@Component({
    selector: 'hr-workload-container',
    template: `@if (user) {
        <div class="row">
            <div class="col-8">
            <hr-workload [user]="user"></hr-workload>
            </div>
            <div class="col-4">
            <hr-workload-heatmap [user]="user" class="mb-3 d-block"></hr-workload-heatmap>
            </div>
        </div>
    }`,
    standalone: true,
    imports: [HrWorkloadComponent, HrWorkloadHeatmapComponent]
})
export class HrWorkloadContainerComponent implements OnInit {
    #hr = inject(HrTeamService)
    user: User | undefined = this.#hr.getUser()

    ngOnInit() {
        this.#hr.onUserChange.subscribe(_ => this.user = _)
    }
}