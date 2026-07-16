import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { tracked } from '@constants/tracked';
import { CustomerDetailGuard } from '@app/customers/customers.details.guard';
import { ProjectSupportComponent } from '@app/projects/id/project-support/project-support.component';

@Component({
    selector: 'customer-support-container',
    template: '@if (company()) {<project-support [parent]="company()!"></project-support>}',
    imports: [ProjectSupportComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerSupportContainerComponent {
    #guard = inject(CustomerDetailGuard);
    company = tracked(this.#guard.object);
}
