import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CompanyService } from '@models/company/company.service';
import { Connection } from '@models/company/connection.model';
import { Company } from '@models/company/company.model';
import { NetworkChart } from '@shards/network-chart/network-chart.component';
import { NxGlobal } from '@app/nx/nx.global';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { SpinnerComponent } from '@shards/spinner/spinner.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'customers-network',
    templateUrl: './customers-network.component.html',
    styleUrls: ['./customers-network.component.scss'],
    standalone: true,
    imports: [NetworkChart, EmptyStateComponent, SpinnerComponent],
})
export class CustomersNetworkComponent {
    connections = signal<Connection[]>([]);
    selectedCompany = signal<Company | null>(null);
    focusCompanyId = signal<string | null>(null);
    loading = signal(false);

    #companyService = inject(CompanyService);
    #router = inject(Router);

    constructor() {
        this.focusCompanyId.set(NxGlobal.ME_ID ? String(NxGlobal.ME_ID) : null);
        this.reload();
    }

    reload() {
        this.loading.set(true);
        this.#companyService.indexAllConnections().subscribe({
            next: (data: any) => {
                this.connections.set(Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []);
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
            },
        });
    }

    onNodeSelected(companyId: string | null) {
        if (!companyId) {
            this.selectedCompany.set(null);
            return;
        }

        // Find company from connections - normalize IDs to strings for comparison
        for (const conn of this.connections()) {
            if (String(conn.company1?.id) === companyId) {
                this.selectedCompany.set(conn.company1);
                return;
            }
            if (String(conn.company2?.id) === companyId) {
                this.selectedCompany.set(conn.company2);
                return;
            }
        }
    }

    navigateToCompany() {
        if (this.selectedCompany()) {
            this.#router.navigate(['/customers', this.selectedCompany()!.id]);
        }
    }
}
