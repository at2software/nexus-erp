import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GlobalService } from '@models/global.service';
import { User } from '@models/user/user.model';
import { HrWorkloadComponent } from '../../hr-workload/hr-workload.component';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';

@Component({
    selector: 'hr-stats-workload',
    standalone: true,
    imports: [HrWorkloadComponent, EmptyStateComponent],
    templateUrl: './hr-stats-workload.component.html',
    styleUrls: ['./hr-stats-workload.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HrStatsWorkloadComponent {
    #global = inject(GlobalService);

    team = signal<User[]>([]);

    constructor() {
        this.#global.init.pipe(takeUntilDestroyed()).subscribe(() => this.team.set(this.#global.team));
    }
}
