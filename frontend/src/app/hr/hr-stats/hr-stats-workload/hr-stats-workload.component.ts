import { Component, inject } from '@angular/core';
import { GlobalService } from '@models/global.service';
import { HrWorkloadComponent } from '../../hr-workload/hr-workload.component';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';

@Component({
  selector: 'hr-stats-workload',
  standalone: true,
  imports: [HrWorkloadComponent, EmptyStateComponent],
  templateUrl: './hr-stats-workload.component.html',
  styleUrls: ['./hr-stats-workload.component.scss']
})
export class HrStatsWorkloadComponent {
    #global = inject(GlobalService)

    getTeam = () => this.#global.team;
}
