import { Component, inject } from '@angular/core';
import { NexusModule } from '@app/nx/nexus.module';
import { SentinelService } from '@models/sentinel.service';
import { takeUntil } from 'rxjs';
import { TabTasksBaseComponent } from '../tab-tasks-base.component';

@Component({
    selector: 'tab-tasks-sentinels',
    templateUrl: './tab-tasks-sentinels.component.html',
    standalone: true,
    imports: [NexusModule]
})
export class TabTasksSentinelsComponent extends TabTasksBaseComponent {

    response: any[] = []

    #sentinelService = inject(SentinelService)

    override reload() {
        this.#sentinelService.indexActive().pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
            this.response = data || []
            this.countChanged.emit(this.response.reduce((sum: number, s: any) => sum + (s.items?.length ?? 0), 0))
        })
    }

    primaryLabel   = (s: any, m: any) => m[s.primaryLabel]
    secondaryLabel = (s: any, m: any) => m[s.secondaryLabel]
}
