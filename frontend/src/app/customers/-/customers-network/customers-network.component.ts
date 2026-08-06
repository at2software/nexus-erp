import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CompanyService } from '@models/company/company.service';
import { Company } from '@models/company/company.model';
import { NetworkChart } from '@shards/network-chart/network-chart.component';
import { GlobalService } from '@models/global.service';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { SpinnerComponent } from '@shards/spinner/spinner.component';
import { modelListResource } from '@models/http/model-resource';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'customers-network',
    templateUrl: './customers-network.component.html',
    styleUrls: ['./customers-network.component.scss'],
    imports: [NetworkChart, EmptyStateComponent, SpinnerComponent],
})
export class CustomersNetworkComponent {
    #global = inject(GlobalService);
    #companyService = inject(CompanyService);
    #router = inject(Router);

    selectedCompany = signal<Company | null>(null);
    focusCompanyId = signal<string | null>(this.#global.me_id ? String(this.#global.me_id) : null);

    #connections = modelListResource(() => this.#companyService.indexAllConnections());
    connections = this.#connections.value;
    loading = this.#connections.isLoading;

    reload = () => this.#connections.reload();

    onNodeSelected(companyId: string | null) {
        if (!companyId) {
            this.selectedCompany.set(null);
            return;
        }

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
