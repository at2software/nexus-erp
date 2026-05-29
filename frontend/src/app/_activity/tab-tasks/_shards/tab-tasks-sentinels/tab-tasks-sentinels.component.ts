import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Nx } from '@app/nx/nx.directive';
import { SentinelService } from '@models/sentinel.service';
import { TabTasksBaseComponent } from '../tab-tasks-base.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'tab-tasks-sentinels',
    templateUrl: './tab-tasks-sentinels.component.html',
    standalone: true,
    imports: [Nx],
})
export class TabTasksSentinelsComponent extends TabTasksBaseComponent {
    response = signal<any[]>([]);

    readonly #collapsed = signal<Set<string>>(new Set());
    toggle = (key: string) => this.#collapsed.update(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });
    isCollapsed = (key: string) => this.#collapsed().has(key);

    #sentinelService = inject(SentinelService);

    override reload() {
        this.#sentinelService
            .indexActive()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((data: any) => {
                const items = data || [];
                this.response.set(items);
                this.countChanged.emit(items.reduce((sum: number, s: any) => sum + (s.items?.length ?? 0), 0));
            });
    }

    primaryLabel = (s: any, m: any) => m[s.primaryLabel];
    secondaryLabel = (s: any, m: any) => m[s.secondaryLabel];
}
