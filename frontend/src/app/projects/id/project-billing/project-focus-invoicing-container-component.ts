import { Component, inject } from "@angular/core";
import { ProjectDetailGuard } from "@app/projects/project-details.guard";
import { ProjectBillingComponent } from "@app/projects/id/project-detail-billing/project-detail-billing.component";


@Component({
    template: '@if (parent.current) {<project-detail-billing [parent]="parent.current"></project-detail-billing>}',
    standalone: true,
    imports: [ProjectBillingComponent]
})
export class ProjectDetailFocusInvoicingContainerComponent {
    parent = inject(ProjectDetailGuard)
}