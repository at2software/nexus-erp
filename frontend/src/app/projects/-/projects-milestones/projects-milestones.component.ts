import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { MilestoneService } from '@models/milestones/milestone.service';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { Nx } from '@app/nx/nx.directive';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { FormsModule } from '@angular/forms';
import { Milestone } from '@models/milestones/milestone.model';
import { Project } from '@models/project/project.model';
import { SpinnerComponent } from '@shards/spinner/spinner.component';

interface OverviewData {
    unassigned: Milestone[];
    overdue: Milestone[];
    noWorkload: Milestone[];
    projects: Project[];
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'projects-milestones',
    standalone: true,
    imports: [DatePipe, RouterModule, NgbTooltipModule, Nx, AvatarComponent, ToolbarComponent, AvatarComponent, FormsModule, SpinnerComponent],
    templateUrl: './projects-milestones.component.html',
    styleUrls: ['./projects-milestones.component.scss'],
})
export class ProjectsMilestonesOverviewComponent implements OnInit {
    #service = inject(MilestoneService);

    loading = signal(true);
    data: OverviewData | null = null;

    ngOnInit() {
        this.loadData();
    }

    loadData() {
        this.loading.set(true);
        this.#service.indexOverview().subscribe({
            next: (data: any) => {
                this.data = data;
                this.loading.set(false);
            },
            error: () => this.loading.set(false),
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
