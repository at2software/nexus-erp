import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { MilestoneService } from '@models/milestones/milestone.service';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { NexusModule } from '@app/nx/nexus.module';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { FormsModule } from '@angular/forms';
import { Milestone } from '@models/milestones/milestone.model';
import { Project } from '@models/project/project.model';

interface OverviewData {
    unassigned: Milestone[];
    overdue: Milestone[];
    noWorkload: Milestone[];
    projects: Project[];
}

@Component({
    selector: 'projects-milestones',
    standalone: true,
    imports: [CommonModule, RouterModule, NgbTooltipModule, NexusModule, ToolbarComponent, AvatarComponent, FormsModule],
    templateUrl: './projects-milestones.component.html',
    styleUrls: ['./projects-milestones.component.scss']
})
export class ProjectsMilestonesOverviewComponent implements OnInit {
    #service = inject(MilestoneService);

    loading = true;
    data: OverviewData | null = null;

    ngOnInit() {
        this.loadData();
    }

    loadData() {
        this.loading = true;
        this.#service.indexOverview().subscribe({
            next: (data: any) => {
                this.data = data;
                this.loading = false;
            },
            error: () => this.loading = false
        });
    }

    getDeviationClass(deviation: number): string {
        const abs = Math.abs(deviation);
        if (abs > 50) return 'text-red';
        if (abs > 25) return 'text-orange';
        if (abs > 10) return 'text-yellow';
        return 'text-green';
    }

    getDaysOverdue(startedAt: string): number {
        const start = new Date(startedAt);
        const today = new Date();
        return Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    }
}
