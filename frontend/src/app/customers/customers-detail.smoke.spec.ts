import type { Type } from '@angular/core';
import { provideDetailGuard, renderComponent } from '@testing/component-test';
import { Company } from '@models/company/company.model';
import { ProjectState } from '@models/project/project-state.model';
import { CustomerDetailGuard } from '@app/customers/customers.details.guard';
import { CustomerDashboard } from '@app/customers/details/customer-dashboard/customer-dashboard';
import { CustomerProjects } from '@app/customers/details/customer-projects/customer-projects';

const components: [string, Type<unknown>][] = [
    ['CustomerDashboard', CustomerDashboard],
    ['CustomerProjects', CustomerProjects],
];

// CustomerProjects renders <project-state-filter>, whose avatars are built from the project
// states the running app loads from /environment.
const projectStates = [0, 1, 2, 3, 4, 5].map((progress) =>
    ProjectState.fromJson({ id: String(progress), name: `state ${progress}`, progress, color: 'primary' }),
);

describe('customer detail pages render', () => {
    it.each(components)('%s', (_name, component) => {
        const fixture = renderComponent(component, {
            providers: [provideDetailGuard(CustomerDetailGuard, () => Company.fromJson({ id: '1', name: 'ACME', employees: [], assignees: [] }))],
            global: { project_states: projectStates },
            tables: { companies: ['name'], project_states: ['name', 'progress', 'color'] },
        });
        expect(fixture.nativeElement).toBeTruthy();
    });
});
