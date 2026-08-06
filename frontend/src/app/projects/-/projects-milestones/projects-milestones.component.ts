import { ChangeDetectionStrategy, Component, inject, linkedSignal } from '@angular/core';
import { modelResource } from '@models/http/model-resource';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { MilestoneService } from '@models/milestone/milestone.service';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { Nx } from '@app/nx/nx.directive';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { FormsModule } from '@angular/forms';
import { SpinnerComponent } from '@shards/spinner/spinner.component';
import { MilestoneData } from '@models/milestone/milestone-group.model';
import { InvoiceItem } from '@models/invoice/invoice-item.model';
import { NxStatic, TBroadcast } from '@app/nx/nx.static';
import { SafePipe } from '@pipes/safe.pipe';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'projects-milestones',
    imports: [DatePipe, RouterModule, NgbTooltipModule, Nx, AvatarComponent, ToolbarComponent, AvatarComponent, FormsModule, SpinnerComponent, SafePipe],
    templateUrl: './projects-milestones.component.html',
})
export class ProjectsMilestonesOverviewComponent {
    #service = inject(MilestoneService);

    readonly #data = modelResource(() => this.#service.indexOverview());
    readonly loading = this.#data.isLoading;
    readonly data = linkedSignal<MilestoneData | undefined, MilestoneData | undefined>({
        source: this.#data.value,
        computation: (value) => value,
        equal: () => false,
    });

    constructor() {
        NxStatic.broadcast$.pipe(
            takeUntilDestroyed(),
            filter((e) => e.type === TBroadcast.Update && e.data instanceof InvoiceItem && !!(e.data as InvoiceItem).milestones?.length),
        ).subscribe((e) => {
            this.data.update((current) => {
                if (!current) return current;
                const item = e.data as InvoiceItem;
                current.invoiceItemsWithoutMilestone = current.invoiceItemsWithoutMilestone.filter((_) => _.id !== item.id);
                return current;
            });
        });
    }

    getDeviationClass(deviation: number): string {
        const abs = Math.abs(deviation);
        if (abs > 50) return 'text-red';
        if (abs > 25) return 'text-orange';
        if (abs > 10) return 'text-yellow';
        return 'text-green';
    }

    getDeviationBarClass(deviation: number): string {
        const abs = Math.abs(deviation);
        if (abs > 50) return 'bg-danger';
        if (abs > 25) return 'bg-warning';
        if (abs > 10) return 'bg-info';
        return 'bg-success';
    }

    getDeviationBarWidth(deviation: number): number {
        return Math.min(Math.abs(deviation), 100);
    }

    getDaysOverdue(startedAt: string): number {
        const start = new Date(startedAt);
        const today = new Date();
        return Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    }
}
