import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { tracked } from '@constants/tracked';
import { HrTeamService } from '../hr-team/hr-team.service';
import { HrWorkloadComponent } from './hr-workload.component';
import { HrWorkloadHeatmapComponent } from '../hr-workload-heatmap/hr-workload-heatmap.component';

@Component({
    selector: 'hr-workload-container',
    template: `@let _user = user(); @if (_user) {
        <div class="row">
            <div class="col-8">
                <hr-workload [user]="_user"></hr-workload>
            </div>
            <div class="col-4">
                <hr-workload-heatmap [user]="_user" class="mb-3 d-block"></hr-workload-heatmap>
            </div>
        </div>
    }`,
    imports: [HrWorkloadComponent, HrWorkloadHeatmapComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HrWorkloadContainerComponent {
    #hr = inject(HrTeamService);

    readonly user = tracked(this.#hr.user);
}
