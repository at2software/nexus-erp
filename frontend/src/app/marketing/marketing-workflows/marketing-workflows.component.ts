import { Component, OnInit, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MarketingService } from '@models/marketing/marketing.service';
import { MarketingWorkflow } from '@models/marketing/marketing-workflow.model';
import { MarketingActivity } from '@models/marketing/marketing-activity.model';
import { NexusModule } from 'src/app/nx/nexus.module';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { GuidedTourComponent } from '@shards/guided-tour/guided-tour.component';

const ActivityStatsColors = MarketingActivity.STATS_COLORS;

@Component({
    selector: 'marketing-workflows',
    templateUrl: './marketing-workflows.component.html',
    styleUrl: './marketing-workflows.component.scss',
    standalone: true,
    imports: [FormsModule, NexusModule, RouterModule, NgbTooltipModule, EmptyStateComponent, GuidedTourComponent]
})
export class MarketingWorkflowsComponent implements OnInit {
    #marketingService = inject(MarketingService);
    #route = inject(ActivatedRoute);
    #router = inject(Router);

    readonly STATS_COLORS = ActivityStatsColors;

    workflows: MarketingWorkflow[] = [];
    currentWorkflowId: string | null = null;

    showCreateModal = false;
    newWorkflow: Partial<MarketingWorkflow> = {
        name: '',
        description: '',
        is_active: true
    };

    ngOnInit() {
        // Monitor child route params to track current workflow
        this.#route.firstChild?.params.subscribe(params => {
            this.currentWorkflowId = params['id'] || null;
        });

        this.loadWorkflows();
    }

    loadWorkflows() {
        this.#marketingService.indexWorkflows()
            .subscribe((workflows: MarketingWorkflow[]) => {
                this.workflows = workflows;

                // Auto-select first workflow if none is selected
                if (workflows.length > 0 && !this.currentWorkflowId) {
                    this.#router.navigate(['/marketing/workflows', workflows[0].id]);
                }
            });
    }

    createWorkflow() {
        if (!this.newWorkflow.name) return;

        this.#marketingService.storeWorkflow({
            name: this.newWorkflow.name!,
            description: this.newWorkflow.description,
            is_active: this.newWorkflow.is_active ?? true
        }).subscribe((workflow: MarketingWorkflow) => {
            this.workflows.push(workflow);
            this.resetCreateForm();
            // Navigate to newly created workflow
            this.#router.navigate(['/marketing/workflows', workflow.id]);
        });
    }

    deleteWorkflow(workflow: MarketingWorkflow) {
        if (!confirm(`Delete workflow "${workflow.name}"?`)) return;

        this.#marketingService.destroyWorkflow(workflow.id)
            .subscribe(() => {
                this.workflows = this.workflows.filter(w => w.id !== workflow.id);
                if (this.currentWorkflowId === workflow.id) {
                    // Navigate to first remaining workflow or no selection
                    if (this.workflows.length > 0) {
                        this.#router.navigate(['/marketing/workflows', this.workflows[0].id]);
                    } else {
                        this.#router.navigate(['/marketing/workflows']);
                    }
                }
            });
    }

    isWorkflowActive(workflowId: string): boolean {
        return this.currentWorkflowId === workflowId;
    }

    resetCreateForm() {
        this.showCreateModal = false;
        this.newWorkflow = {
            name: '',
            description: '',
            is_active: true
        };
    }
}
