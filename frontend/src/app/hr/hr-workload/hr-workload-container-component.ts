import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { tracked } from '@constants/tracked';
import { User } from '@models/user/user.model';
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

    protected readonly _user = signal<User | undefined>(this.#hr.getUser());
    readonly user = tracked(this._user);

    constructor() {
        this.#hr.onUserChange.subscribe((_) => this._user.set(_));
    }
}
