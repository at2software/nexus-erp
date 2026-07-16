import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { tracked } from '@constants/tracked';
import { ProjectDetailGuard } from '@app/projects/project-details.guard';
import { ProjectBillingComponent } from '@app/projects/id/project-billing/project-billing.component';

@Component({
    template: '@if (parent.object()) {<project-billing [parent]="parent.object()"></project-billing>}',
    imports: [ProjectBillingComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectDetailFocusInvoicingContainerComponent {
    parent = inject(ProjectDetailGuard);

    readonly object = tracked(this.parent.object);
}
