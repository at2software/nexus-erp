import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Nx } from '@app/nx/nx.directive';
import { SentinelService } from '@models/sentinels/sentinel.service';
import { TabTasksBaseComponent } from '../tab-tasks-base.component';
import { SentinelActiveGroup, SentinelActiveItem, SentinelLabelConfig } from '@models/api-response';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'tab-tasks-sentinels',
    templateUrl: './tab-tasks-sentinels.component.html',
    imports: [Nx],
})
export class TabTasksSentinelsComponent extends TabTasksBaseComponent {
    response = signal<SentinelActiveGroup[]>([]);

    #sentinelService = inject(SentinelService);

    override reload() {
        this.#sentinelService
            .indexActive()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((data) => {
                const items = data || [];
                this.response.set(items);
                this.countChanged.emit(items.reduce((sum, s) => sum + (s.items?.length ?? 0), 0));
            });
    }

    primaryLabel = (s: SentinelLabelConfig, m: SentinelActiveItem) => m[s.primaryLabel];
    secondaryLabel = (s: SentinelLabelConfig, m: SentinelActiveItem) => m[s.secondaryLabel];
}
