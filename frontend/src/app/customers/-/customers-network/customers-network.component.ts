import { Component, inject, ViewChild, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CompanyService } from '@models/company/company.service';
import { Connection } from '@models/company/connection.model';
import { Company } from '@models/company/company.model';
import { NetworkChart } from '@shards/network-chart/network-chart.component';
import { NxGlobal } from '@app/nx/nx.global';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';

@Component({
    selector: 'customers-network',
    templateUrl: './customers-network.component.html',
    styleUrls: ['./customers-network.component.scss'],
    standalone: true,
    imports: [NetworkChart, EmptyStateComponent]
})
export class CustomersNetworkComponent implements OnInit {

    connections: Connection[] = []
    selectedCompany: Company | null = null
    focusCompanyId: string | null = null

    #companyService = inject(CompanyService)
    #router = inject(Router)

    @ViewChild(NetworkChart) chart: NetworkChart

    ngOnInit() {
        this.focusCompanyId = NxGlobal.ME_ID ? String(NxGlobal.ME_ID) : null
        this.reload()
    }

    reload() {
        this.#companyService.indexAllConnections().subscribe(data => {
            this.connections = data
        })
    }

    onNodeSelected(companyId: string | null) {
        if (!companyId) {
            this.selectedCompany = null
            return
        }

        // Find company from connections - normalize IDs to strings for comparison
        for (const conn of this.connections) {
            if (String(conn.company1?.id) === companyId) {
                this.selectedCompany = conn.company1
                return
            }
            if (String(conn.company2?.id) === companyId) {
                this.selectedCompany = conn.company2
                return
            }
        }
    }

    navigateToCompany() {
        if (this.selectedCompany) {
            this.#router.navigate(['/customers', this.selectedCompany.id])
        }
    }
}
