import type { Type } from '@angular/core';
import { renderComponent } from '@testing/component-test';
import { CustomerAddToInitiativeModalComponent } from '@app/customers/_shards/customer-initiatives/customer-add-to-initiative-modal/customer-add-to-initiative-modal.component';
import { CustomersMaintenanceBirthdaysComponent } from '@app/customers/-/customers-maintenance/customers-maintenance-birthdays/customers-maintenance-birthdays.component';
import { CustomersMaintenanceCommercialRegisterComponent } from '@app/customers/-/customers-maintenance/customers-maintenance-commercial-register/customers-maintenance-commercial-register.component';
import { CustomersMapComponent } from '@app/customers/-/customers-map/customers-map.component';
import { CustomersNetworkComponent } from '@app/customers/-/customers-network/customers-network.component';
import { CustomersStatisticsComponent } from '@app/customers/-/customers-statistics/customers-statistics.component';
import { CustomerConnections } from '@app/customers/details/customer-connections/customer-connections';

const components: [string, Type<unknown>][] = [
    ['CustomerAddToInitiativeModalComponent', CustomerAddToInitiativeModalComponent],
    ['CustomersMaintenanceBirthdaysComponent', CustomersMaintenanceBirthdaysComponent],
    ['CustomersMaintenanceCommercialRegisterComponent', CustomersMaintenanceCommercialRegisterComponent],
    ['CustomersMapComponent', CustomersMapComponent],
    ['CustomersNetworkComponent', CustomersNetworkComponent],
    ['CustomersStatisticsComponent', CustomersStatisticsComponent],
    ['CustomerConnections', CustomerConnections],
];

// Every component here loads through the Resource API. Nothing resolves under the testing
// HTTP backend, so this asserts only that the loading state renders without throwing.
describe('customers renders', () => {
    it.each(components)('%s', (_name, component) => {
        expect(renderComponent(component).nativeElement).toBeTruthy();
    });
});
