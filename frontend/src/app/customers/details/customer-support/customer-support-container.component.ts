import { Component, inject } from '@angular/core';
import { CustomerDetailGuard } from '@app/customers/customers.details.guard';
import { ProjectSupportComponent } from '@app/projects/id/project-support/project-support.component';

@Component({
    template: '@if (guard.current) {<project-support [parent]="guard.current"></project-support>}',
    standalone: true,
    imports: [ProjectSupportComponent]
})
export class CustomerSupportContainerComponent {
    guard = inject(CustomerDetailGuard)
}
