import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'customers-maintenance',
    templateUrl: './customers-maintenance.component.html',
    styleUrls: ['./customers-maintenance.component.scss'],
    standalone: true,
    imports: [RouterModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomersMaintenanceComponent {}
