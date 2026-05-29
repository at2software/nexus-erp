import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { Nx } from '@app/nx/nx.directive';
import { NComponent } from '@shards/n/n.component';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { Company } from '@models/company/company.model';
import { MarketingService } from '@models/marketing/marketing.service';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { TabTasksBaseComponent } from '../tab-tasks-base.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'tab-tasks-remarketing',
    templateUrl: './tab-tasks-remarketing.component.html',
    standalone: true,
    imports: [Nx, NComponent, AvatarComponent, NgbTooltipModule, DatePipe],
})
export class TabTasksRemarketingComponent extends TabTasksBaseComponent {
    due = signal<Company[]>([]);

    readonly #collapsed = signal<Set<string>>(new Set());
    toggle = (key: string) => this.#collapsed.update(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });
    isCollapsed = (key: string) => this.#collapsed().has(key);

    #marketing = inject(MarketingService);

    override reload() {
        this.#marketing
            .getRemarketingDue()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((response: any[]) => {
                this.due.set(response.map((_) => {
                    const n = Company.fromJson(_);
                    n.var.remarketing_due_at = _.remarketing_due_at;
                    return n;
                }));
            });
    }
}
